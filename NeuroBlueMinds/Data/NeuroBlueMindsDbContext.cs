using Microsoft.EntityFrameworkCore;
using NeuroBlueMinds.Shared.DbModels;

namespace NeuroBlueMinds.Data
{
  public class NeuroBlueMindsDbContext : DbContext
  {
    public NeuroBlueMindsDbContext(DbContextOptions<NeuroBlueMindsDbContext> options)
        : base(options)
    {
    }

    // ────────────────────────────────────────────────
    // DbSets
    // ────────────────────────────────────────────────
    public DbSet<User> Users { get; set; }
    public DbSet<GameProgress> GameProgresses { get; set; }
    public DbSet<GameResult> GameResults { get; set; }
    public DbSet<ParentQuizSession> ParentQuizSessions { get; set; }
    public DbSet<ParentQuizResponse> ParentQuizResponses { get; set; }
    public DbSet<QuizSession> QuizSessions { get; set; }
    public DbSet<QuizResponse> QuizResponses { get; set; }
    public DbSet<TherapySession> TherapySessions { get; set; }
    public DbSet<ChildProfile> ChildProfiles { get; set; }
    public DbSet<VarkResult> VarkResults { get; set; }
    public DbSet<ProfessionalAccess> ProfessionalAccesses { get; set; }
    public DbSet<AchievementBadge> AchievementBadges { get; set; }
    public DbSet<IndividualInterventionPlan> IndividualInterventionPlans { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);

      // 1. CONFIGURACIÓN DE TABLAS (Manual/Snake_case)
      modelBuilder.Entity<User>(entity =>
      {
        entity.ToTable("users");
        entity.HasIndex(e => e.Email).IsUnique();
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.Birth).HasColumnType("date");
      });


      modelBuilder.Entity<GameProgress>(entity =>
      {
        entity.ToTable("game_progress");
        entity.HasIndex(e => new { e.UserId, e.GameId }).IsUnique();
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.CompletionPercentage).HasColumnType("real");
      });

      modelBuilder.Entity<GameResult>(entity =>
      {
        entity.ToTable("game_results");
        entity.Property(e => e.PlayedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.Accuracy).HasColumnType("double precision");
      });

      modelBuilder.Entity<ParentQuizSession>(entity =>
      {
        entity.ToTable("parent_quiz_sessions");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.DetailedProfile).HasColumnType("jsonb");
      });

      modelBuilder.Entity<ParentQuizResponse>(entity =>
      {
        entity.ToTable("parent_quiz_responses");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
      });

      modelBuilder.Entity<QuizSession>(entity =>
      {
        entity.ToTable("quiz_sessions");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
      });

      modelBuilder.Entity<ChildProfile>(entity =>
      {
        entity.ToTable("child_profiles");
        entity.HasIndex(e => e.ChildUserId).IsUnique();
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.AdaptiveState).HasColumnType("jsonb");
        entity.HasOne(c => c.Parent)
             .WithMany(u => u.ChildProfiles)
             .HasForeignKey(c => c.ParentUserId)
             .OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(c => c.ChildUser)
             .WithOne()
             .HasForeignKey<ChildProfile>(c => c.ChildUserId)
             .OnDelete(DeleteBehavior.Cascade);
      });

      modelBuilder.Entity<QuizResponse>(entity =>
      {
        entity.ToTable("quiz_responses");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.Answer).HasColumnType("jsonb");
      });

      modelBuilder.Entity<TherapySession>(entity =>
      {
        entity.ToTable("therapy_sessions");
        entity.Property(e => e.SessionDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property(e => e.IsDeleted).HasDefaultValue(false);
        entity.HasOne(t => t.ChildProfile)
              .WithMany()
              .HasForeignKey(t => t.ChildProfileId)
              .OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(t => t.Specialist)
              .WithMany()
              .HasForeignKey(t => t.SpecialistUserId)
              .OnDelete(DeleteBehavior.SetNull)
              .IsRequired(false);
      });

      modelBuilder.Entity<VarkResult>(entity =>
      {
        entity.ToTable("vark_results");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.RawResponse).HasColumnType("jsonb");
        entity.HasOne(v => v.ChildUser)
              .WithMany()
              .HasForeignKey(v => v.ChildUserId)
              .OnDelete(DeleteBehavior.Cascade);
      });

      // 2. RELACIONES
      modelBuilder.Entity<ParentQuizResponse>()
          .HasOne(r => r.Session)
          .WithMany(s => s.Responses)
          .HasForeignKey(r => r.SessionId)
          .OnDelete(DeleteBehavior.Cascade);

      modelBuilder.Entity<QuizResponse>()
          .HasOne(r => r.QuizSession)
          .WithMany(s => s.Responses)
          .HasForeignKey(r => r.QuizSessionId)
          .OnDelete(DeleteBehavior.Cascade);


      modelBuilder.Entity<ProfessionalAccess>(entity =>
      {
        entity.ToTable("professional_access");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        entity.HasOne(p => p.ChildProfile).WithMany().HasForeignKey(p => p.ChildProfileId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(p => p.Parent).WithMany().HasForeignKey(p => p.ParentUserId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(p => p.Specialist).WithMany().HasForeignKey(p => p.SpecialistUserId).OnDelete(DeleteBehavior.SetNull).IsRequired(false);
      });

      modelBuilder.Entity<AchievementBadge>(entity =>
      {
        entity.ToTable("achievement_badges");
        entity.Property(e => e.EarnedAt).HasDefaultValueSql("now()");
        entity.HasOne(a => a.ChildProfile)
              .WithMany()
              .HasForeignKey(a => a.ChildProfileId)
              .OnDelete(DeleteBehavior.Cascade);
        entity.HasIndex(a => new { a.ChildProfileId, a.BadgeType }).IsUnique();
      });

      modelBuilder.Entity<IndividualInterventionPlan>(entity =>
      {
        entity.ToTable("individual_intervention_plans");
        entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()");
        entity.Property(e => e.Status).HasDefaultValue("active");
        entity.HasOne(p => p.ChildProfile)
              .WithMany()
              .HasForeignKey(p => p.ChildProfileId)
              .OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(p => p.Specialist)
              .WithMany()
              .HasForeignKey(p => p.SpecialistUserId)
              .OnDelete(DeleteBehavior.SetNull)
              .IsRequired(false);
      });

      // 3. ¡LA MAGIA PARA SUPABASE! (Forzar minúsculas en todo)
      // Esto arregla el error "column q.Id does not exist"
      foreach (var entity in modelBuilder.Model.GetEntityTypes())
      {
        // Forzar nombre de tabla a minúsculas (si no se definió arriba)
        var tableName = entity.GetTableName();
        if (!string.IsNullOrEmpty(tableName))
          entity.SetTableName(tableName.ToLower());

        // Forzar CADA columna a minúsculas
        foreach (var property in entity.GetProperties())
        {
          property.SetColumnName(property.GetColumnName().ToLower());
        }

        // Forzar llaves primarias, foráneas e índices
        foreach (var key in entity.GetKeys())
          key.SetName(key.GetName()?.ToLower());

        foreach (var fk in entity.GetForeignKeys())
          fk.SetConstraintName(fk.GetConstraintName()?.ToLower());

        foreach (var index in entity.GetIndexes())
          index.SetDatabaseName(index.GetDatabaseName()?.ToLower());
      }
    }

    // ────────────────────────────────────────────────
    // Manejo automático de UpdatedAt
    // ────────────────────────────────────────────────
    public override int SaveChanges()
    {
      ApplyUpdatedAt();
      return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
      ApplyUpdatedAt();
      return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyUpdatedAt()
    {
      var entries = ChangeTracker.Entries()
          .Where(e => e.Entity is IHasUpdatedAt && (e.State == EntityState.Modified || e.State == EntityState.Added));

      foreach (var entry in entries)
      {
        ((IHasUpdatedAt)entry.Entity).UpdatedAt = DateTime.UtcNow;
      }
    }
  }

  public interface IHasUpdatedAt
  {
    DateTime UpdatedAt { get; set; }
  }
}
