using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NeuroBlueMinds.Migrations
{
    /// <inheritdoc />
    public partial class AddProfessionalAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "adaptivestate",
                table: "child_profiles",
                type: "jsonb",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "professional_access",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    childprofileid = table.Column<int>(type: "integer", nullable: false),
                    parentuserid = table.Column<int>(type: "integer", nullable: false),
                    specialistuserid = table.Column<int>(type: "integer", nullable: true),
                    specialistemail = table.Column<string>(type: "character varying", nullable: false),
                    specialistname = table.Column<string>(type: "character varying", nullable: true),
                    status = table.Column<string>(type: "character varying", nullable: false),
                    accesslevel = table.Column<string>(type: "character varying", nullable: false),
                    invitetoken = table.Column<string>(type: "character varying", nullable: true),
                    inviteexpiresat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    acceptedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_professional_access", x => x.id);
                    table.ForeignKey(
                        name: "fk_professional_access_child_profiles_childprofileid",
                        column: x => x.childprofileid,
                        principalTable: "child_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_professional_access_users_parentuserid",
                        column: x => x.parentuserid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_professional_access_users_specialistuserid",
                        column: x => x.specialistuserid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "vark_results",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    childuserid = table.Column<int>(type: "integer", nullable: false),
                    participantidentifier = table.Column<string>(type: "character varying", nullable: false),
                    visualscore = table.Column<int>(type: "integer", nullable: false),
                    auralscore = table.Column<int>(type: "integer", nullable: false),
                    readwritescore = table.Column<int>(type: "integer", nullable: false),
                    kinestheticscore = table.Column<int>(type: "integer", nullable: false),
                    dominantstyle = table.Column<string>(type: "character varying", nullable: false),
                    rawresponse = table.Column<string>(type: "jsonb", nullable: true),
                    varkresultid = table.Column<string>(type: "character varying", nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vark_results", x => x.id);
                    table.ForeignKey(
                        name: "fk_vark_results_users_childuserid",
                        column: x => x.childuserid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_professional_access_childprofileid",
                table: "professional_access",
                column: "childprofileid");

            migrationBuilder.CreateIndex(
                name: "ix_professional_access_parentuserid",
                table: "professional_access",
                column: "parentuserid");

            migrationBuilder.CreateIndex(
                name: "ix_professional_access_specialistuserid",
                table: "professional_access",
                column: "specialistuserid");

            migrationBuilder.CreateIndex(
                name: "ix_vark_results_childuserid",
                table: "vark_results",
                column: "childuserid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "professional_access");

            migrationBuilder.DropTable(
                name: "vark_results");

            migrationBuilder.DropColumn(
                name: "adaptivestate",
                table: "child_profiles");
        }
    }
}
