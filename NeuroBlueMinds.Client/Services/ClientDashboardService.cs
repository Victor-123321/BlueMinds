// NeuroBlueMinds.Client/Services/ClientDashboardService.cs

using System.Net.Http.Json;
using NeuroBlueMinds.Shared.Interfaces;
using NeuroBlueMinds.Shared.DbModels;
using NeuroBlueMinds.Shared.DTOs;

public class ClientDashboardService : IDashboardService
{
  private readonly HttpClient _http;
  public ClientDashboardService(HttpClient http) => _http = http;

  // ── Dashboard ─────────────────────────────────────────────────────────────
  public async Task<DeepAnalysisResult> GetDeepAnalysisAsync(int userId, string userName)
      => await _http.GetFromJsonAsync<DeepAnalysisResult>(
             $"api/dashboard/analysis/{userId}/{Uri.EscapeDataString(userName)}")
         ?? new DeepAnalysisResult();

  public async Task<NeuroprofileAnalysisDto> GetRoadmapAsync(int userId, string userName)
      => await _http.GetFromJsonAsync<NeuroprofileAnalysisDto>(
             $"api/dashboard/roadmap/{userId}/{Uri.EscapeDataString(userName)}")
         ?? new NeuroprofileAnalysisDto { ChildName = userName };

  public async Task<List<SessionHistory>> GetHistoryAsync(int userId)
      => await _http.GetFromJsonAsync<List<SessionHistory>>(
             $"api/dashboard/history/{userId}")
         ?? new List<SessionHistory>();

  public async Task<UserSummaryDTO> GetUserSummaryAsync(int userId)
      => await _http.GetFromJsonAsync<UserSummaryDTO>(
             $"api/dashboard/summary/{userId}")
         ?? new UserSummaryDTO();

  // ── Games ─────────────────────────────────────────────────────────────────
  public async Task<bool> SaveGameResultAsync(SaveGameResultDto result, int userId = 0)
  {
    var r = await _http.PostAsJsonAsync("api/dashboard/save-result", result);
    return r.IsSuccessStatusCode;
  }

  // ── Parent quiz ───────────────────────────────────────────────────────────
  public async Task<ParentQuizSession?> GetActiveParentSessionAsync(int userId)
  {
    try
    {
      var r = await _http.GetAsync($"api/dashboard/parent-session/{userId}");
      if (r.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
      r.EnsureSuccessStatusCode();
      return await r.Content.ReadFromJsonAsync<ParentQuizSession>();
    }
    catch
    {
      return null;
    }
  }

  public async Task<bool> SaveParentResponseAsync(int userId, int index, string section, string answer)
  {
    try
    {
      var r = await _http.PostAsJsonAsync("api/dashboard/save-parent-response",
          new { QuestionIndex = index, Section = section, Answer = answer });
      return r.IsSuccessStatusCode;
    }
    catch
    {
      return false;
    }
  }

  public async Task<bool> CompleteParentSessionAsync(int userId, int communicationScore, string learningStyle)
  {
    try
    {
      var r = await _http.PostAsJsonAsync("api/dashboard/complete-parent-quiz",
          new { CommunicationScore = communicationScore, LearningStyle = learningStyle });
      return r.IsSuccessStatusCode;
    }
    catch
    {
      return false;
    }
  }

  // ── Child quiz ────────────────────────────────────────────────────────────
  public async Task<QuizSession?> GetActiveChildSessionAsync(int userId)
  {
    try
    {
      var r = await _http.GetAsync("api/dashboard/child-session");
      if (r.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
      r.EnsureSuccessStatusCode();
      // The endpoint wraps in { progress: {...} } — unwrap it
      var wrapper = await r.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
      var prog = wrapper.GetProperty("progress");
      return new QuizSession
      {
        Id = prog.GetProperty("id").GetInt64(),
        CurrentQuestionIndex = prog.GetProperty("current_question_index").GetInt32(),
        IsCompleted = prog.GetProperty("is_completed").GetBoolean()
      };
    }
    catch
    {
      return null;
    }
  }

  public async Task<long> CreateChildSessionAsync(int userId)
  {
    // Session creation is handled server-side in save-child-response when sessionId == 0
    return 0;
  }

  public async Task<bool> SaveChildResponseAsync(
      int userId, long sessionId, int questionIndex,
      string questionType, string learningStyle, int nivel,
      string answerJson, bool isCorrect, int responseTimeMs)
  {
    try
    {
      var r = await _http.PostAsJsonAsync("api/dashboard/save-child-response", new
      {
        SessionId = sessionId,
        QuestionIndex = questionIndex,
        QuestionType = questionType,
        LearningStyle = learningStyle,
        Nivel = nivel,
        AnswerJson = answerJson,
        IsCorrect = isCorrect,
        ResponseTimeMs = responseTimeMs
      });
      return r.IsSuccessStatusCode;
    }
    catch
    {
      return false;
    }
  }

  public async Task<QuizCompleteResponseDto> CompleteChildSessionAsync(
      int userId, long sessionId, string answersJson, int totalTimeSeconds)
  {
    try
    {
      var r = await _http.PostAsJsonAsync("api/dashboard/complete-child-quiz", new
      {
        SessionId = sessionId,
        AnswersJson = answersJson,
        TotalTimeSeconds = totalTimeSeconds
      });
      r.EnsureSuccessStatusCode();
      return await r.Content.ReadFromJsonAsync<QuizCompleteResponseDto>()
             ?? new QuizCompleteResponseDto();
    }
    catch
    {
      return new QuizCompleteResponseDto();
    }
  }

  // ── Adaptive Engine ───────────────────────────────────────────────────────
  /// <summary>
  /// Fetches ranked activity recommendations from the Adaptive Engine for the
  /// currently selected child (JWT is swapped by ChildAwareHttpHandler).
  /// Returns an empty result gracefully if the child has no data yet.
  /// </summary>
  public async Task<AdaptiveRecommendationsDto> GetRecommendationsAsync()
  {
    try
    {
      var result = await _http.GetFromJsonAsync<AdaptiveRecommendationsDto>(
          "api/adaptive/recommendations");
      return result ?? new AdaptiveRecommendationsDto();
    }
    catch
    {
      return new AdaptiveRecommendationsDto();
    }
  }
}
