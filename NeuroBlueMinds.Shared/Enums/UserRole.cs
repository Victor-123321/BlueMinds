// NeuroBlueMinds.Shared/Enums/UserRole.cs
namespace NeuroBlueMinds.Shared.Enums;

public enum UserRole
{
    Child      = 0,   // The learner — sees Kid Dashboard
    Parent     = 1,   // Tutor/Guardian — sees Parent Dashboard + analytics
    Specialist = 2,   // Therapist/Teacher — sees Clinical Dashboard
    Admin      = 3    // Institutional admin
}
