using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using NeuroBlueMinds.Data;
using NeuroBlueMinds.Shared.DTOs;
using Google.Apis.Auth;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.Interfaces;
using Microsoft.EntityFrameworkCore;  // Necesario para validar Google tokens → instala Google.Apis.Auth


namespace NeuroBlueMinds.Server.Services;

public class ServerAuthService : IAuthService
{
  private readonly NeuroBlueMindsDbContext _db;
  private readonly IConfiguration _config;
  private readonly IHttpContextAccessor _httpContextAccessor;

  public ServerAuthService(
      NeuroBlueMindsDbContext db,
      IConfiguration config,
      IHttpContextAccessor httpContextAccessor)
  {
    _db = db;
    _config = config;
    _httpContextAccessor = httpContextAccessor;
  }

  private string GenerateJwt(User user)
  {
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, user.Name ?? ""),
        new Claim(ClaimTypes.Role, user.Role ?? "child"),
        new Claim("locale", user.Locale ?? "es-MX"),
        new Claim("picture", user.Picture ?? "")
    };

    if (user.Birth.HasValue)
    {
      claims.Add(new Claim("birth", user.Birth.Value.ToString("yyyy-MM-dd")));
    }

    if (!string.IsNullOrEmpty(user.Country))
    {
      claims.Add(new Claim("country", user.Country));
    }


    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key no configurado")));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims: claims,
        expires: DateTime.UtcNow.AddDays(7),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
  }

  private UserProfileDto MapUserToProfile(User user) => new()
  {
    Id = user.Id,
    Name = user.Name ?? "",
    Email = user.Email,
    Picture = user.Picture,
    Birth = user.Birth,
    Country = user.Country,
    Role = user.Role ?? "child",   // ← ensures Login can read role for routing
    Locale = user.Locale ?? "es-MX"
  };

  // ────────────────────────────────────────────────
  // Registro normal (email + password)
  // ────────────────────────────────────────────────
  public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
  {
    if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
    {
      throw new BadHttpRequestException("Este correo ya está registrado");
    }


    var user = new User
    {
      Name = dto.Name,
      Email = dto.Email,
      Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
      Role = "pending",   // ← pending until onboarding completes
      Locale = "es-MX",
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow
    };

    _db.Users.Add(user);
    await _db.SaveChangesAsync();

    var token = GenerateJwt(user);

    return new AuthResponseDto
    {
      Token = GenerateJwt(user),
      User = MapUserToProfile(user),
      NeedsOnboarding = true   // ← ALWAYS true for new accounts — role selection is mandatory
    };
  }

  // ────────────────────────────────────────────────
  // Login normal (email + password)
  // ────────────────────────────────────────────────
  public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
  {
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

    if (user == null || string.IsNullOrEmpty(user.Password) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
    {
      throw new UnauthorizedAccessException("Correo o contraseña incorrectos");
    }

    var token = GenerateJwt(user);

    return new AuthResponseDto
    {
      Token = token,
      User = MapUserToProfile(user),
      NeedsOnboarding = user.Birth == null || string.IsNullOrEmpty(user.Country)
    };
  }

  // ────────────────────────────────────────────────
  // Google OAuth
  // ────────────────────────────────────────────────
  public async Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto)
  {
    var payload = await GoogleJsonWebSignature.ValidateAsync(dto.Token, new GoogleJsonWebSignature.ValidationSettings
    {
      Audience = new[] { _config["Google:ClientId"] ?? throw new InvalidOperationException("Google:ClientId no configurado") }
    });

    var sub = payload.Subject;
    var email = payload.Email;
    var name = payload.Name ?? "Usuario Google";
    var picture = payload.Picture;

    var user = await _db.Users.FirstOrDefaultAsync(u => u.Sub == sub || u.Email == email);

    bool isNewUser = user == null;

    if (user == null)
    {
      user = new User
      {
        Sub = sub,
        Name = name,
        Email = email,
        Picture = picture,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
      };

      _db.Users.Add(user);
      await _db.SaveChangesAsync();
    }
    else
    {
      // Actualizar datos si cambiaron
      user.Name = name;
      user.Picture = picture;
      user.UpdatedAt = DateTime.UtcNow;
      await _db.SaveChangesAsync();
    }

    var token = GenerateJwt(user);

    return new AuthResponseDto
    {
      Token = token,
      User = MapUserToProfile(user),
      NeedsOnboarding = isNewUser || user.Birth == null || string.IsNullOrEmpty(user.Country)
    };
  }

  // ────────────────────────────────────────────────
  // Obtener perfil del usuario autenticado
  // ────────────────────────────────────────────────
  public async Task<UserProfileDto> GetProfileAsync()
  {
    var userIdStr = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("No autenticado");

    if (!int.TryParse(userIdStr, out var userId))
      throw new UnauthorizedAccessException("ID de usuario inválido");

    var user = await _db.Users.FindAsync(userId)
        ?? throw new KeyNotFoundException("Usuario no encontrado");

    return MapUserToProfile(user);
  }

  // ────────────────────────────────────────────────
  // Completar perfil (birth + country)
  // ────────────────────────────────────────────────
  public async Task<UserProfileDto> CompleteProfileAsync(CompleteProfileDto dto)
  {
    // 1. Obtener ID del usuario del Token actual
    var userIdStr = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("Sesión expirada o inválida");

    if (!int.TryParse(userIdStr, out var userId))
      throw new UnauthorizedAccessException("ID de usuario no válido");

    var user = await _db.Users.FindAsync(userId)
        ?? throw new KeyNotFoundException("El usuario ya no existe en la base de datos");

    // 2. ALWAYS update role and locale — these must be set even if birth/country already exist.
    //    This fixes the bug where re-registering kept the old role ("pending").
    if (!string.IsNullOrWhiteSpace(dto.Role))
      user.Role = dto.Role;

    if (!string.IsNullOrWhiteSpace(dto.Locale))
      user.Locale = dto.Locale;

    // 3. Procesar Fecha solo si no está ya registrada (o si viene nueva)
    if (dto.Birth.HasValue)
    {
      user.Birth = DateOnly.FromDateTime(dto.Birth.Value);
    }
    else if (!user.Birth.HasValue)
    {
      throw new BadHttpRequestException("Formato de fecha de nacimiento incorrecto");
    }

    // 4. País
    if (!string.IsNullOrWhiteSpace(dto.Country))
      user.Country = dto.Country;
    else if (string.IsNullOrEmpty(user.Country))
      throw new BadHttpRequestException("El país es requerido");

    user.UpdatedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();

    // 5. Generar nuevo token con todos los datos actualizados (incluyendo el rol real)
    var newToken = GenerateJwt(user);

    var profile = MapUserToProfile(user);
    profile.Token = newToken;   // cliente actualiza localStorage con este token

    return profile;
  }

  // ────────────────────────────────────────────────
  // Actualizar perfil (name, country, birth limitado)
  // ────────────────────────────────────────────────
  public async Task<UserProfileDto> UpdateProfileAsync(UpdateProfileDto dto)
  {
    var userIdStr = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("No autenticado");

    if (!int.TryParse(userIdStr, out var userId))
      throw new UnauthorizedAccessException("ID de usuario inválido");

    var user = await _db.Users.FindAsync(userId)
        ?? throw new KeyNotFoundException("Usuario no encontrado");

    bool changed = false;

    if (!string.IsNullOrWhiteSpace(dto.Name))
    {
      user.Name = dto.Name.Trim();
      changed = true;
    }

    if (!string.IsNullOrWhiteSpace(dto.Country))
    {
      user.Country = dto.Country.Trim();
      changed = true;
    }

    if (!string.IsNullOrWhiteSpace(dto.Birth))
    {
      if (user.Birth.HasValue)
        throw new BadHttpRequestException("La fecha de nacimiento solo puede establecerse una vez");

      if (DateOnly.TryParse(dto.Birth, out var birthDate))
      {
        user.Birth = birthDate;
        changed = true;
      }
      else
      {
        throw new BadHttpRequestException("Fecha de nacimiento inválida");
      }
    }

    if (!changed)
      throw new BadHttpRequestException("No se proporcionaron campos para actualizar");

    user.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    var newToken = GenerateJwt(user);

    return MapUserToProfile(user);
  }

  // ────────────────────────────────────────────────
  // Logout (no hace nada en server, solo cliente elimina token)
  // ────────────────────────────────────────────────
  public Task LogoutAsync()
  {
    // En el servidor no hay sesión activa que destruir (stateless JWT)
    return Task.CompletedTask;
  }

  // Nota: UploadAvatarAsync lo puedes implementar en otro servicio (ej: StorageService)
  // porque involucra IFormFile y Supabase Storage.
  // Si lo quieres aquí también, dime y lo agrego en el siguiente mensaje.
}
