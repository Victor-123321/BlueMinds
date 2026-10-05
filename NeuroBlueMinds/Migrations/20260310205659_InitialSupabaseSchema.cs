using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NeuroBlueMinds.Migrations
{
    /// <inheritdoc />
    public partial class InitialSupabaseSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    country = table.Column<string>(type: "text", nullable: true),
                    password = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    sub = table.Column<string>(type: "text", nullable: true),
                    picture = table.Column<string>(type: "text", nullable: true),
                    birth = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "game_progress",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    gameid = table.Column<string>(type: "text", nullable: false),
                    gametitle = table.Column<string>(type: "text", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    level = table.Column<int>(type: "integer", nullable: false),
                    maxlevel = table.Column<int>(type: "integer", nullable: false),
                    completionpercentage = table.Column<float>(type: "real", nullable: false),
                    timesplayed = table.Column<int>(type: "integer", nullable: false),
                    totaltime = table.Column<int>(type: "integer", nullable: false),
                    lastplayedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_progress", x => x.id);
                    table.ForeignKey(
                        name: "fk_game_progress_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "game_results",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    gameid = table.Column<string>(type: "character varying", nullable: false),
                    learningstyle = table.Column<string>(type: "character varying", nullable: false),
                    difficultylevel = table.Column<int>(type: "integer", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    accuracy = table.Column<double>(type: "double precision", nullable: true),
                    responsetimems = table.Column<int>(type: "integer", nullable: true),
                    playedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_game_results", x => x.id);
                    table.ForeignKey(
                        name: "fk_game_results_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "parent_quiz_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    currentquestionindex = table.Column<int>(type: "integer", nullable: false),
                    iscompleted = table.Column<bool>(type: "boolean", nullable: false),
                    communicationscore = table.Column<int>(type: "integer", nullable: false),
                    learningstyle = table.Column<string>(type: "text", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    detailedprofile = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_parent_quiz_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_parent_quiz_sessions_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    currentquestionindex = table.Column<int>(type: "integer", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    totaltimeseconds = table.Column<int>(type: "integer", nullable: false),
                    learningstyle = table.Column<string>(type: "text", nullable: true),
                    suggestedlevel = table.Column<int>(type: "integer", nullable: true),
                    iscompleted = table.Column<bool>(type: "boolean", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quiz_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_quiz_sessions_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "therapy_sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: true),
                    gameid = table.Column<string>(type: "text", nullable: false),
                    sessiondate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    duration = table.Column<int>(type: "integer", nullable: true),
                    performance = table.Column<string>(type: "jsonb", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_therapy_sessions", x => x.id);
                    table.ForeignKey(
                        name: "fk_therapy_sessions_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "parent_quiz_responses",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    questionindex = table.Column<int>(type: "integer", nullable: false),
                    section = table.Column<string>(type: "text", nullable: false),
                    answer = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    sessionid = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_parent_quiz_responses", x => x.id);
                    table.ForeignKey(
                        name: "fk_parent_quiz_responses_parent_quiz_sessions_sessionid",
                        column: x => x.sessionid,
                        principalTable: "parent_quiz_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_parent_quiz_responses_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quiz_responses",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    questionindex = table.Column<int>(type: "integer", nullable: false),
                    questiontype = table.Column<string>(type: "text", nullable: false),
                    learningstyle = table.Column<string>(type: "text", nullable: false),
                    nivel = table.Column<int>(type: "integer", nullable: false),
                    answer = table.Column<string>(type: "jsonb", nullable: false),
                    iscorrect = table.Column<bool>(type: "boolean", nullable: false),
                    responsetimems = table.Column<int>(type: "integer", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    quizsessionid = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_quiz_responses", x => x.id);
                    table.ForeignKey(
                        name: "fk_quiz_responses_quiz_sessions_quizsessionid",
                        column: x => x.quizsessionid,
                        principalTable: "quiz_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_quiz_responses_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_game_progress_userid_gameid",
                table: "game_progress",
                columns: new[] { "userid", "gameid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_game_results_userid",
                table: "game_results",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_parent_quiz_responses_sessionid",
                table: "parent_quiz_responses",
                column: "sessionid");

            migrationBuilder.CreateIndex(
                name: "ix_parent_quiz_responses_userid",
                table: "parent_quiz_responses",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_parent_quiz_sessions_userid",
                table: "parent_quiz_sessions",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_quiz_responses_quizsessionid",
                table: "quiz_responses",
                column: "quizsessionid");

            migrationBuilder.CreateIndex(
                name: "ix_quiz_responses_userid",
                table: "quiz_responses",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_quiz_sessions_userid",
                table: "quiz_sessions",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_therapy_sessions_userid",
                table: "therapy_sessions",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "game_progress");

            migrationBuilder.DropTable(
                name: "game_results");

            migrationBuilder.DropTable(
                name: "parent_quiz_responses");

            migrationBuilder.DropTable(
                name: "quiz_responses");

            migrationBuilder.DropTable(
                name: "therapy_sessions");

            migrationBuilder.DropTable(
                name: "parent_quiz_sessions");

            migrationBuilder.DropTable(
                name: "quiz_sessions");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
