using NeuroBlueMinds.Shared.DTOs;
namespace NeuroBlueMinds.Shared.Interfaces;

using System.IO;

public interface IAuthService
{
  Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
  Task<AuthResponseDto> LoginAsync(LoginDto dto);
  Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto);
  Task<UserProfileDto> GetProfileAsync();
  Task<UserProfileDto> CompleteProfileAsync(CompleteProfileDto dto);
  Task<UserProfileDto> UpdateProfileAsync(UpdateProfileDto dto);
  Task LogoutAsync();
}
