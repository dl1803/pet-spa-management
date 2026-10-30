using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessExcludeConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:btree_gist", ",,");

            migrationBuilder.Sql("""
                ALTER TABLE "AppointmentStaff" ADD CONSTRAINT ex_staff_busy
                    EXCLUDE USING gist ("StaffId" WITH =, tstzrange("BusyFrom", "BusyUntil") WITH &&)
                    WHERE ("IsHolding");
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "WorkShift" ADD CONSTRAINT ex_shift_overlap
                    EXCLUDE USING gist ("StaffId" WITH =, tstzrange("ShiftStart", "ShiftEnd") WITH &&);
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Appointment" ADD CONSTRAINT ex_cage_night
                    EXCLUDE USING gist (
                        "CageId" WITH =,
                        daterange(
                            ("PlannedCheckIn" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                            ("PlannedCheckOut" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                            '[)') WITH &&)
                    WHERE ("Type" = 'Hotel' AND "Status" IN ('Confirmed', 'InStay'));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Appointment\" DROP CONSTRAINT IF EXISTS ex_cage_night;");
            migrationBuilder.Sql("ALTER TABLE \"WorkShift\" DROP CONSTRAINT IF EXISTS ex_shift_overlap;");
            migrationBuilder.Sql("ALTER TABLE \"AppointmentStaff\" DROP CONSTRAINT IF EXISTS ex_staff_busy;");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:btree_gist", ",,");
        }
    }
}
