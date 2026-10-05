using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NeuroBlueMinds.Shared.DbModels
{
  // ────────────────────────────────────────────────
  // Users
  // ────────────────────────────────────────────────
  [Table("users", Schema = "public")]
  public class User
  {
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = null!;

    [Required]
    public string Email { get; set; } = null!;

    public string? Country { get; set; }

    public string? Password { get; set; }           // ← normalmente no se expone así

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string? Sub { get; set; }                // probablemente para OAuth / identity
    public string? Picture { get; set; }
    public DateOnly? Birth { get; set; }            // DateOnly es ideal para solo fecha


    [Column(TypeName = "character varying")]
    public string Role { get; set; } = "child";   // "child" | "parent" | "specialist" | "admin"

    /// <summary>
    /// Preferred locale code e.g. "es-MX", "en-US".
    /// Stored so the server can render locale-aware emails/reports.
    /// The client reads this on login and syncs with localStorage.
    /// </summary>
    [Column(TypeName = "character varying")]
    public string? Locale { get; set; } = "es-MX";

    // Navigation properties (opcional, pero útil)
    public ICollection<GameProgress> GameProgresses { get; set; } = new List<GameProgress>();
    public ICollection<ChildProfile> ChildProfiles { get; set; } = new List<ChildProfile>();
    public ICollection<GameResult> GameResults { get; set; } = new List<GameResult>();
    public ICollection<ParentQuizResponse> ParentQuizResponses { get; set; } = new List<ParentQuizResponse>();
    public ICollection<ParentQuizSession> ParentQuizSessions { get; set; } = new List<ParentQuizSession>();
    public ICollection<QuizResponse> QuizResponses { get; set; } = new List<QuizResponse>();
    public ICollection<QuizSession> QuizSessions { get; set; } = new List<QuizSession>();
    public ICollection<TherapySession> TherapySessions { get; set; } = new List<TherapySession>();

  }


  [Table("child_profiles", Schema = "public")]
  public class ChildProfile
  {
    [Key]
    public int Id { get; set; }

    /// <summary>Parent account that owns this profile.</summary>
    [Required]
    public int ParentUserId { get; set; }

    /// <summary>
    /// The User row created for this child.
    /// All quiz/game data is stored against this UserId.
    /// </summary>
    [Required]
    public int ChildUserId { get; set; }

    [Required]
    public string Name { get; set; } = null!;
    public string? Avatar { get; set; } = "🦕";
    public DateOnly? Birth { get; set; }

    /// <summary>JSON blob: AdaptiveStateDto — child's learning state model.</summary>
    [Column(TypeName = "jsonb")]
    public string? AdaptiveState { get; set; }

    // Cached from last completed quiz — updated by DashboardService
    public string? DominantStyle { get; set; }
    public int SuggestedLevel { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ParentUserId))]
    public User Parent { get; set; } = null!;

    [ForeignKey(nameof(ChildUserId))]
    public User ChildUser { get; set; } = null!;
  }


  // ────────────────────────────────────────────────
  // game_progress
  // ────────────────────────────────────────────────
  [Table("game_progress", Schema = "public")]
  public class GameProgress
  {
    [Key]
    public int Id { get; set; }

    public int? UserId { get; set; }

    [Required]
    public string GameId { get; set; } = null!;

    [Required]
    public string GameTitle { get; set; } = null!;

    public int Score { get; set; } = 0;
    public int Level { get; set; } = 1;
    public int MaxLevel { get; set; } = 1;
    public float CompletionPercentage { get; set; } = 0;
    public int TimesPlayed { get; set; } = 0;
    public int TotalTime { get; set; } = 0;

    public DateTime? LastPlayedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
  }


  // ────────────────────────────────────────────────
  // game_results
  // ────────────────────────────────────────────────
  [Table("game_results", Schema = "public")]
  public class GameResult
  {
    [Key]
    public int Id { get; set; }

    public int? UserId { get; set; }

    [Required]
    [Column(TypeName = "character varying")]
    public string GameId { get; set; } = null!;

    [Required]
    [Column(TypeName = "character varying")]
    public string LearningStyle { get; set; } = null!;

    public int DifficultyLevel { get; set; } = 1;

    [Required]
    public int Score { get; set; }

    public double? Accuracy { get; set; }
    public int? ResponseTimeMs { get; set; }

    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
  }


  // ────────────────────────────────────────────────
  // parent_quiz_sessions
  // ────────────────────────────────────────────────
  [Table("parent_quiz_sessions", Schema = "public")]
  public class ParentQuizSession
  {
    [Key]
    public long Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int CurrentQuestionIndex { get; set; } = 0;

    public bool IsCompleted { get; set; } = false;

    public int CommunicationScore { get; set; } = 0;

    public string? LearningStyle { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // jsonb → la forma más simple es string
    [Column(TypeName = "jsonb")]
    public string? DetailedProfile { get; set; }

    // Alternativa recomendada (más limpia) ↓↓↓
    // public ParentQuizDetailedProfile? DetailedProfile { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<ParentQuizResponse> Responses { get; set; } = new List<ParentQuizResponse>();
  }


  // ────────────────────────────────────────────────
  // parent_quiz_responses
  // ────────────────────────────────────────────────
  [Table("parent_quiz_responses", Schema = "public")]
  public class ParentQuizResponse
  {
    [Key]
    public long Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int QuestionIndex { get; set; }

    [Required]
    public string Section { get; set; } = null!;

    [Required]
    public string Answer { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public long? SessionId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(SessionId))]
    public ParentQuizSession? Session { get; set; }
  }


  // ────────────────────────────────────────────────
  // quiz_sessions
  // ────────────────────────────────────────────────
  [Table("quiz_sessions", Schema = "public")]
  public class QuizSession
  {
    [Key]
    public long Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int CurrentQuestionIndex { get; set; } = 0;

    [Required]
    public int Score { get; set; } = 0;

    [Required]
    public int TotalTimeSeconds { get; set; } = 0;

    public string? LearningStyle { get; set; }

    public int? SuggestedLevel { get; set; }

    public bool IsCompleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    public ICollection<QuizResponse> Responses { get; set; } = new List<QuizResponse>();
  }


  // ────────────────────────────────────────────────
  // quiz_responses
  // ────────────────────────────────────────────────
  [Table("quiz_responses", Schema = "public")]
  public class QuizResponse
  {
    [Key]
    public long Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int QuestionIndex { get; set; }

    [Required]
    public string QuestionType { get; set; } = null!;

    [Required]
    public string LearningStyle { get; set; } = null!;

    [Required]
    public int Nivel { get; set; }

    [Required]
    [Column(TypeName = "jsonb")]
    public string Answer { get; set; } = null!;     // ← jsonb como string

    [Required]
    public bool IsCorrect { get; set; }

    public int? ResponseTimeMs { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public long? QuizSessionId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(QuizSessionId))]
    public QuizSession? QuizSession { get; set; }
  }


  // ────────────────────────────────────────────────
  // therapy_sessions
  // ────────────────────────────────────────────────
  [Table("therapy_sessions", Schema = "public")]
  public class TherapySession
  {
    [Key]
    public int Id { get; set; }

    /// <summary>The child profile this therapy session is for.</summary>
    [Required]
    public int ChildProfileId { get; set; }

    /// <summary>The specialist (clinician) who created this session.</summary>
    public int? SpecialistUserId { get; set; }

    /// <summary>Date and time of the therapy session.</summary>
    public DateTime SessionDate { get; set; } = DateTime.UtcNow;

    /// <summary>Duration of session in minutes.</summary>
    public int DurationMinutes { get; set; } = 0;

    /// <summary>Session objectives / goals.</summary>
    public string? Objectives { get; set; }

    /// <summary>Clinical notes, observations, interventions.</summary>
    public string? Notes { get; set; }

    /// <summary>Outcomes observed, next steps.</summary>
    public string? Outcomes { get; set; }

    /// <summary>Soft delete flag.</summary>
    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ChildProfileId))]
    public ChildProfile? ChildProfile { get; set; }

    [ForeignKey(nameof(SpecialistUserId))]
    public User? Specialist { get; set; }
  }


  // ────────────────────────────────────────────────
  // vark_results  (VARK API official assessment)
  // Validated for ages 12+. For younger children we
  // use the in-house 20-question quiz instead.
  // ────────────────────────────────────────────────
  [Table("vark_results", Schema = "public")]
  public class VarkResult
  {
    [Key]
    public int Id { get; set; }

    /// <summary>The child user this result belongs to.</summary>
    [Required]
    public int ChildUserId { get; set; }

    /// <summary>
    /// Identifier sent to the VARK API.
    /// Format: "nbm_{childUserId}_{timestamp}" — ensures uniqueness and traceability.
    /// Use "api_test" for sandbox testing (does not consume quota).
    /// </summary>
    [Required]
    [Column(TypeName = "character varying")]
    public string ParticipantIdentifier { get; set; } = null!;

    // ── VARK scores (0–16 each) ──────────────────
    public int VisualScore     { get; set; } = 0;
    public int AuralScore      { get; set; } = 0;
    public int ReadWriteScore  { get; set; } = 0;
    public int KinestheticScore { get; set; } = 0;

    /// <summary>
    /// Dominant style mapped to platform keys:
    /// V→visual, A→auditivo, R→lectoescritura, K→kinestesico
    /// May be multimodal e.g. "visual,auditivo"
    /// </summary>
    [Column(TypeName = "character varying")]
    public string DominantStyle { get; set; } = "";

    /// <summary>Raw JSON response from VARK API for audit / re-processing.</summary>
    [Column(TypeName = "jsonb")]
    public string? RawResponse { get; set; }

    /// <summary>VARK API result_id for reference / verification.</summary>
    [Column(TypeName = "character varying")]
    public string? VarkResultId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ChildUserId))]
    public User ChildUser { get; set; } = null!;
  }

  // ────────────────────────────────────────────────
  // professional_access  (specialist ↔ child profile)
  // Created when a parent invites a specialist.
  // ────────────────────────────────────────────────
  [Table("professional_access", Schema = "public")]
  public class ProfessionalAccess
  {
    [Key]
    public int Id { get; set; }

    /// <summary>The child profile this access is for.</summary>
    [Required]
    public int ChildProfileId { get; set; }

    /// <summary>The parent who owns the child profile and sent the invite.</summary>
    [Required]
    public int ParentUserId { get; set; }

    /// <summary>
    /// The specialist user being invited.
    /// NULL while status = "pending" (specialist hasn't registered yet).
    /// </summary>
    public int? SpecialistUserId { get; set; }

    /// <summary>Email the invite was sent to.</summary>
    [Required]
    [Column(TypeName = "character varying")]
    public string SpecialistEmail { get; set; } = null!;

    /// <summary>Display name of the specialist (from invite form).</summary>
    [Column(TypeName = "character varying")]
    public string? SpecialistName { get; set; }

    /// <summary>pending | active | revoked</summary>
    [Column(TypeName = "character varying")]
    public string Status { get; set; } = "pending";

    /// <summary>view | full</summary>
    [Column(TypeName = "character varying")]
    public string AccessLevel { get; set; } = "full";

    /// <summary>Secure token sent in invite email. Expires after 7 days.</summary>
    [Column(TypeName = "character varying")]
    public string? InviteToken { get; set; }

    public DateTime? InviteExpiresAt { get; set; }
    public DateTime? AcceptedAt      { get; set; }
    public DateTime  CreatedAt       { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt       { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ChildProfileId))]
    public ChildProfile ChildProfile { get; set; } = null!;

    [ForeignKey(nameof(ParentUserId))]
    public User Parent { get; set; } = null!;

    [ForeignKey(nameof(SpecialistUserId))]
    public User? Specialist { get; set; }
  }


  // ────────────────────────────────────────────────
  // achievement_badges
  // Tracks unlocked achievements per child profile.
  // ────────────────────────────────────────────────
  [Table("achievement_badges", Schema = "public")]
  public class AchievementBadge
  {
    [Key]
    public int Id { get; set; }

    /// <summary>Child profile that earned the badge.</summary>
    [Required]
    public int ChildProfileId { get; set; }

    /// <summary>
    /// Badge type key: first_game | streak_3 | streak_7 | streak_30 |
    /// accuracy_80 | accuracy_95 | quiz_complete | vark_complete |
    /// milestone_1 | milestone_5 | milestone_10 | social_share
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string BadgeType { get; set; } = "";

    /// <summary>Display name shown in the UI.</summary>
    [MaxLength(128)]
    public string? Title { get; set; }

    /// <summary>Short description shown in the tooltip/modal.</summary>
    [MaxLength(256)]
    public string? Description { get; set; }

    /// <summary>Emoji or icon identifier for the badge.</summary>
    [MaxLength(8)]
    public string? Emoji { get; set; }

    /// <summary>XP points awarded when this badge was unlocked.</summary>
    public int XpAwarded { get; set; } = 0;

    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ChildProfileId))]
    public ChildProfile? ChildProfile { get; set; }
  }


  // ────────────────────────────────────────────────
  // individual_intervention_plans (PII)
  // Stores intervention goals and target dates per child.
  // ────────────────────────────────────────────────
  [Table("individual_intervention_plans", Schema = "public")]
  public class IndividualInterventionPlan
  {
    [Key]
    public int Id { get; set; }

    [Required]
    public int ChildProfileId { get; set; }

    /// <summary>Specialist who created or last updated the PII.</summary>
    public int? SpecialistUserId { get; set; }

    [Required]
    [MaxLength(256)]
    public string GoalTitle { get; set; } = "";

    [MaxLength(1024)]
    public string? GoalDescription { get; set; }

    /// <summary>Category: cognitive | social | motor | language | emotional</summary>
    [MaxLength(64)]
    public string? Category { get; set; }

    /// <summary>Status: active | achieved | paused | cancelled</summary>
    [MaxLength(32)]
    public string Status { get; set; } = "active";

    public DateTime? TargetDate { get; set; }
    public DateTime? AchievedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(ChildProfileId))]
    public ChildProfile? ChildProfile { get; set; }

    [ForeignKey(nameof(SpecialistUserId))]
    public User? Specialist { get; set; }
  }
}