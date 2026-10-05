// NeuroBlueMinds.Shared/Interfaces/IDashboardService.cs
// Namespace unified to NeuroBlueMinds.Shared.Interfaces.
// Update usings in: DashboardController.cs, DashboardService.cs, ClientDashboardService.cs, Program.cs (client)

using NeuroBlueMinds.Shared.DTOs;
using NeuroBlueMinds.Shared.DbModels;

namespace NeuroBlueMinds.Shared.Interfaces;   // ← was BlueMinds.Shared.Interfaces

public interface IDashboardService
{
    // Dashboard
    Task<DeepAnalysisResult>      GetDeepAnalysisAsync(int userId, string userName);
    Task<NeuroprofileAnalysisDto> GetRoadmapAsync(int userId, string userName);
    Task<List<SessionHistory>>    GetHistoryAsync(int userId);
    Task<UserSummaryDTO>          GetUserSummaryAsync(int userId);

    // Games
    Task<bool> SaveGameResultAsync(SaveGameResultDto result, int userId);

    // Parent quiz
    Task<ParentQuizSession?> GetActiveParentSessionAsync(int userId);
    Task<bool>               SaveParentResponseAsync(int userId, int index, string section, string answer);
    Task<bool>               CompleteParentSessionAsync(int userId, int communicationScore, string learningStyle);

    // Child quiz
    Task<QuizSession?>            GetActiveChildSessionAsync(int userId);
    Task<long>                    CreateChildSessionAsync(int userId);
    Task<bool>                    SaveChildResponseAsync(int userId, long sessionId, int questionIndex,
                                      string questionType, string learningStyle, int nivel,
                                      string answerJson, bool isCorrect, int responseTimeMs);
    Task<QuizCompleteResponseDto> CompleteChildSessionAsync(int userId, long sessionId,
                                      string answersJson, int totalTimeSeconds);
}
