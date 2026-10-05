using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NeuroBlueMinds.Migrations
{
    /// <inheritdoc />
    public partial class AddTherapyAchievementsPII : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "gameid",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "performance",
                table: "therapy_sessions");

            migrationBuilder.RenameColumn(
                name: "duration",
                table: "therapy_sessions",
                newName: "specialistuserid");

            migrationBuilder.AddColumn<int>(
                name: "childprofileid",
                table: "therapy_sessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "createdat",
                table: "therapy_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<int>(
                name: "durationminutes",
                table: "therapy_sessions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "isdeleted",
                table: "therapy_sessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "objectives",
                table: "therapy_sessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "outcomes",
                table: "therapy_sessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "updatedat",
                table: "therapy_sessions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateTable(
                name: "achievement_badges",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    childprofileid = table.Column<int>(type: "integer", nullable: false),
                    badgetype = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    title = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    description = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    emoji = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    xpawarded = table.Column<int>(type: "integer", nullable: false),
                    earnedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_achievement_badges", x => x.id);
                    table.ForeignKey(
                        name: "fk_achievement_badges_child_profiles_childprofileid",
                        column: x => x.childprofileid,
                        principalTable: "child_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "individual_intervention_plans",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    childprofileid = table.Column<int>(type: "integer", nullable: false),
                    specialistuserid = table.Column<int>(type: "integer", nullable: true),
                    goaltitle = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    goaldescription = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    category = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false, defaultValue: "active"),
                    targetdate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    achievedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_individual_intervention_plans", x => x.id);
                    table.ForeignKey(
                        name: "fk_individual_intervention_plans_child_profiles_childprofileid",
                        column: x => x.childprofileid,
                        principalTable: "child_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_individual_intervention_plans_users_specialistuserid",
                        column: x => x.specialistuserid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_therapy_sessions_childprofileid",
                table: "therapy_sessions",
                column: "childprofileid");

            migrationBuilder.CreateIndex(
                name: "ix_therapy_sessions_specialistuserid",
                table: "therapy_sessions",
                column: "specialistuserid");

            migrationBuilder.CreateIndex(
                name: "ix_achievement_badges_childprofileid_badgetype",
                table: "achievement_badges",
                columns: new[] { "childprofileid", "badgetype" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_individual_intervention_plans_childprofileid",
                table: "individual_intervention_plans",
                column: "childprofileid");

            migrationBuilder.CreateIndex(
                name: "ix_individual_intervention_plans_specialistuserid",
                table: "individual_intervention_plans",
                column: "specialistuserid");

            migrationBuilder.AddForeignKey(
                name: "fk_therapy_sessions_child_profiles_childprofileid",
                table: "therapy_sessions",
                column: "childprofileid",
                principalTable: "child_profiles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_therapy_sessions_users_specialistuserid",
                table: "therapy_sessions",
                column: "specialistuserid",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_therapy_sessions_child_profiles_childprofileid",
                table: "therapy_sessions");

            migrationBuilder.DropForeignKey(
                name: "fk_therapy_sessions_users_specialistuserid",
                table: "therapy_sessions");

            migrationBuilder.DropTable(
                name: "achievement_badges");

            migrationBuilder.DropTable(
                name: "individual_intervention_plans");

            migrationBuilder.DropIndex(
                name: "ix_therapy_sessions_childprofileid",
                table: "therapy_sessions");

            migrationBuilder.DropIndex(
                name: "ix_therapy_sessions_specialistuserid",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "childprofileid",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "createdat",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "durationminutes",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "isdeleted",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "objectives",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "outcomes",
                table: "therapy_sessions");

            migrationBuilder.DropColumn(
                name: "updatedat",
                table: "therapy_sessions");

            migrationBuilder.RenameColumn(
                name: "specialistuserid",
                table: "therapy_sessions",
                newName: "duration");

            migrationBuilder.AddColumn<string>(
                name: "gameid",
                table: "therapy_sessions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "performance",
                table: "therapy_sessions",
                type: "jsonb",
                nullable: true);
        }
    }
}
