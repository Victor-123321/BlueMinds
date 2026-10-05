// NeuroBlueMinds.Shared/DTOs/AuthDtos.cs — COMPLETE REPLACEMENT
namespace NeuroBlueMinds.Shared.DTOs;

public class RegisterDto
{
    public string Name            { get; set; } = string.Empty;
    public string Birth           { get; set; } = string.Empty;
    public string Email           { get; set; } = string.Empty;
    public string Country         { get; set; } = string.Empty;
    public string Password        { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class LoginDto
{
    public string Email    { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class GoogleAuthDto
{
    public string Token { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserProfileDto User { get; set; } = null!;
    public bool NeedsOnboarding { get; set; }
}

public class UserProfileDto
{
    public int      Id      { get; set; }
    public string   Name    { get; set; } = string.Empty;
    public string   Email   { get; set; } = string.Empty;
    public string?  Picture { get; set; }
    public DateOnly? Birth  { get; set; }
    public string?  Country { get; set; }
    public string?  Token   { get; set; }   // new JWT after profile update
    public string?  Role    { get; set; }   // "child" | "parent" | "specialist"
    public string?  Locale  { get; set; }   // "es-MX" | "en-US" etc.
}

public class CompleteProfileDto
{
    public DateTime? Birth   { get; set; }
    public string    Country { get; set; } = string.Empty;
    public string?   Role    { get; set; } = "child";
    public string?   Locale  { get; set; } = "es-MX";
}

public class UpdateProfileDto
{
    public string? Name    { get; set; }
    public string? Country { get; set; }
    public string? Birth   { get; set; }
    public string? Role    { get; set; }
    public string? Locale  { get; set; }
}

public class AvatarUploadResponseDto
{
    public string Message   { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
}
