using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeuroBlueMinds.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "child_profiles",
                schema: "public",
                newName: "child_profiles");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updatedat",
                table: "child_profiles",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "createdat",
                table: "child_profiles",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "now()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<int>(
                name: "childuserid",
                table: "child_profiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "ix_child_profiles_childuserid",
                table: "child_profiles",
                column: "childuserid",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_child_profiles_users_childuserid",
                table: "child_profiles",
                column: "childuserid",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_child_profiles_users_childuserid",
                table: "child_profiles");

            migrationBuilder.DropIndex(
                name: "ix_child_profiles_childuserid",
                table: "child_profiles");

            migrationBuilder.DropColumn(
                name: "childuserid",
                table: "child_profiles");

            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.RenameTable(
                name: "child_profiles",
                newName: "child_profiles",
                newSchema: "public");

            migrationBuilder.AlterColumn<DateTime>(
                name: "updatedat",
                schema: "public",
                table: "child_profiles",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");

            migrationBuilder.AlterColumn<DateTime>(
                name: "createdat",
                schema: "public",
                table: "child_profiles",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "now()");
        }
    }
}
