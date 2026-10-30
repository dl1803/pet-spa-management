using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PetSpa.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cage",
                columns: table => new
                {
                    CageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cage", x => x.CageId);
                    table.CheckConstraint("CK_Cage_SizeGroup", "\"SizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_Cage_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                });

            migrationBuilder.CreateTable(
                name: "Customer",
                columns: table => new
                {
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    IsBookingLocked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Customer", x => x.CustomerId);
                    table.ForeignKey(
                        name: "FK_Customer_AppUser_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "HotelPricing",
                columns: table => new
                {
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PricePerNight = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    FoodPerNight = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotelPricing", x => new { x.Species, x.SizeGroup });
                    table.CheckConstraint("CK_HotelPricing_FoodPerNight", "\"FoodPerNight\" >= 0");
                    table.CheckConstraint("CK_HotelPricing_PricePerNight", "\"PricePerNight\" >= 0");
                    table.CheckConstraint("CK_HotelPricing_SizeGroup", "\"SizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_HotelPricing_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                });

            migrationBuilder.CreateTable(
                name: "RefreshToken",
                columns: table => new
                {
                    TokenId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "text", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshToken", x => x.TokenId);
                    table.ForeignKey(
                        name: "FK_RefreshToken_AppUser_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "Service",
                columns: table => new
                {
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    LatestStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Service", x => x.ServiceId);
                });

            migrationBuilder.CreateTable(
                name: "SizeRule",
                columns: table => new
                {
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Criterion = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    SmallUpper = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: false),
                    MediumUpper = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SizeRule", x => new { x.Species, x.Criterion });
                    table.CheckConstraint("CK_SizeRule_Criterion", "\"Criterion\" IN ('Weight', 'Height')");
                    table.CheckConstraint("CK_SizeRule_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                });

            migrationBuilder.CreateTable(
                name: "Staff",
                columns: table => new
                {
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    StaffRole = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Staff", x => x.StaffId);
                    table.CheckConstraint("CK_Staff_StaffRole", "\"StaffRole\" IN ('Receptionist', 'SpaStaff')");
                    table.ForeignKey(
                        name: "FK_Staff_AppUser_UserId",
                        column: x => x.UserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "SystemConfig",
                columns: table => new
                {
                    ConfigKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ConfigValue = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemConfig", x => x.ConfigKey);
                });

            migrationBuilder.CreateTable(
                name: "WeightTolerance",
                columns: table => new
                {
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    FromGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ToGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ToleranceKg = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeightTolerance", x => new { x.Species, x.FromGroup, x.ToGroup });
                    table.CheckConstraint("CK_WeightTolerance_FromGroup", "\"FromGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_WeightTolerance_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                    table.CheckConstraint("CK_WeightTolerance_ToGroup", "\"ToGroup\" IN ('Small', 'Medium', 'Large')");
                });

            migrationBuilder.CreateTable(
                name: "Pet",
                columns: table => new
                {
                    PetId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Breed = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Temperament = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "Normal"),
                    WeightKg = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    HeightCm = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    CoatNote = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    SizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pet", x => x.PetId);
                    table.CheckConstraint("CK_Pet_SizeGroup", "\"SizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_Pet_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                    table.CheckConstraint("CK_Pet_Temperament", "\"Temperament\" IN ('Calm', 'Normal', 'Difficult')");
                    table.CheckConstraint("CK_Pet_WeightKg", "\"WeightKg\" > 0");
                    table.ForeignKey(
                        name: "FK_Pet_Customer_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customer",
                        principalColumn: "CustomerId");
                });

            migrationBuilder.CreateTable(
                name: "ServicePricing",
                columns: table => new
                {
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Species = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    StaffRequired = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicePricing", x => new { x.ServiceId, x.Species, x.SizeGroup });
                    table.CheckConstraint("CK_ServicePricing_DurationMinutes", "\"DurationMinutes\" > 0");
                    table.CheckConstraint("CK_ServicePricing_Price", "\"Price\" >= 0");
                    table.CheckConstraint("CK_ServicePricing_SizeGroup", "\"SizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_ServicePricing_Species", "\"Species\" IN ('Dog', 'Cat', 'Rabbit', 'GuineaPig')");
                    table.CheckConstraint("CK_ServicePricing_StaffRequired", "\"StaffRequired\" IN (1, 2)");
                    table.ForeignKey(
                        name: "FK_ServicePricing_Service_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Service",
                        principalColumn: "ServiceId");
                });

            migrationBuilder.CreateTable(
                name: "WorkShift",
                columns: table => new
                {
                    ShiftId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShiftStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ShiftEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkShift", x => x.ShiftId);
                    table.CheckConstraint("CK_WorkShift_ShiftEnd", "\"ShiftEnd\" > \"ShiftStart\"");
                    table.ForeignKey(
                        name: "FK_WorkShift_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "StaffId");
                });

            migrationBuilder.CreateTable(
                name: "Appointment",
                columns: table => new
                {
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false, defaultValue: "Pending"),
                    CancelReason = table.Column<string>(type: "character varying(25)", maxLength: 25, nullable: true),
                    CancelledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ActualWeightKg = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    PlannedCheckIn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    PlannedCheckOut = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ActualCheckOut = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CageId = table.Column<Guid>(type: "uuid", nullable: true),
                    SlotStart = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SlotEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    BusyUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    StaffRequired = table.Column<short>(type: "smallint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointment", x => x.AppointmentId);
                    table.CheckConstraint("CK_Appointment_CancelReason", "\"CancelReason\" IN ('CustomerCancelled', 'StoreUnable', 'CustomerBeyondDeadline', 'NoShow', 'CostNotConfirmed')");
                    table.CheckConstraint("CK_Appointment_CancelReasonRequired", "(\"Status\" = 'Cancelled' AND \"CancelReason\" IS NOT NULL) OR (\"Status\" <> 'Cancelled' AND \"CancelReason\" IS NULL)");
                    table.CheckConstraint("CK_Appointment_SizeGroup", "\"SizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_Appointment_StaffRequired", "\"StaffRequired\" IN (1, 2)");
                    table.CheckConstraint("CK_Appointment_Status", "\"Status\" IN ('Pending', 'Confirmed', 'Received', 'InProgress', 'InStay', 'Completed', 'Cancelled')");
                    table.CheckConstraint("CK_Appointment_Type", "\"Type\" IN ('Spa', 'Hotel')");
                    table.CheckConstraint("CK_Appointment_TypeColumns", "(\"Type\" = 'Spa' AND \"SlotStart\" IS NOT NULL AND \"SlotEnd\" IS NOT NULL AND \"BusyUntil\" IS NOT NULL AND \"StaffRequired\" IS NOT NULL AND \"PlannedCheckIn\" IS NULL AND \"PlannedCheckOut\" IS NULL AND \"ActualCheckOut\" IS NULL AND \"CageId\" IS NULL) OR (\"Type\" = 'Hotel' AND \"PlannedCheckIn\" IS NOT NULL AND \"PlannedCheckOut\" IS NOT NULL AND \"SlotStart\" IS NULL AND \"SlotEnd\" IS NULL AND \"BusyUntil\" IS NULL AND \"StaffRequired\" IS NULL)");
                    table.ForeignKey(
                        name: "FK_Appointment_Cage_CageId",
                        column: x => x.CageId,
                        principalTable: "Cage",
                        principalColumn: "CageId");
                    table.ForeignKey(
                        name: "FK_Appointment_Customer_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Customer",
                        principalColumn: "CustomerId");
                    table.ForeignKey(
                        name: "FK_Appointment_Pet_PetId",
                        column: x => x.PetId,
                        principalTable: "Pet",
                        principalColumn: "PetId");
                });

            migrationBuilder.CreateTable(
                name: "AppointmentPhoto",
                columns: table => new
                {
                    PhotoId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    UploadedByStaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    UploadedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentPhoto", x => x.PhotoId);
                    table.CheckConstraint("CK_AppointmentPhoto_Kind", "\"Kind\" IN ('Before', 'After')");
                    table.ForeignKey(
                        name: "FK_AppointmentPhoto_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                    table.ForeignKey(
                        name: "FK_AppointmentPhoto_Staff_UploadedByStaffId",
                        column: x => x.UploadedByStaffId,
                        principalTable: "Staff",
                        principalColumn: "StaffId");
                });

            migrationBuilder.CreateTable(
                name: "AppointmentService",
                columns: table => new
                {
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsDone = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DoneAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentService", x => new { x.AppointmentId, x.ServiceId });
                    table.ForeignKey(
                        name: "FK_AppointmentService_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                    table.ForeignKey(
                        name: "FK_AppointmentService_Service_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Service",
                        principalColumn: "ServiceId");
                });

            migrationBuilder.CreateTable(
                name: "AppointmentStaff",
                columns: table => new
                {
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    BusyFrom = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    BusyUntil = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsHolding = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    AssignedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentStaff", x => new { x.AppointmentId, x.StaffId });
                    table.ForeignKey(
                        name: "FK_AppointmentStaff_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                    table.ForeignKey(
                        name: "FK_AppointmentStaff_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "StaffId");
                });

            migrationBuilder.CreateTable(
                name: "CostConfirmation",
                columns: table => new
                {
                    ConfirmationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActualWeightKg = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    NewSizeGroup = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    OldAmount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    NewAmount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    Status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RespondedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RespondedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CostConfirmation", x => x.ConfirmationId);
                    table.CheckConstraint("CK_CostConfirmation_NewSizeGroup", "\"NewSizeGroup\" IN ('Small', 'Medium', 'Large')");
                    table.CheckConstraint("CK_CostConfirmation_Status", "\"Status\" IN ('Pending', 'Accepted', 'Rejected', 'Expired')");
                    table.ForeignKey(
                        name: "FK_CostConfirmation_AppUser_RespondedByUserId",
                        column: x => x.RespondedByUserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_CostConfirmation_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                });

            migrationBuilder.CreateTable(
                name: "Notification",
                columns: table => new
                {
                    NotificationId = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipientUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    Message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.NotificationId);
                    table.CheckConstraint("CK_Notification_Type", "\"Type\" IN ('BookingReceived', 'ConfirmedAssigned', 'StatusChanged', 'Cancelled', 'PaymentRecorded', 'CostConfirmation')");
                    table.ForeignKey(
                        name: "FK_Notification_AppUser_RecipientUserId",
                        column: x => x.RecipientUserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_Notification_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                });

            migrationBuilder.CreateTable(
                name: "Payment",
                columns: table => new
                {
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    Status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "Unpaid"),
                    Method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    ReceivedAmount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: true),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfirmedByUserId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payment", x => x.PaymentId);
                    table.CheckConstraint("CK_Payment_Amount", "\"Amount\" >= 0");
                    table.CheckConstraint("CK_Payment_Kind", "\"Kind\" IN ('Spa', 'Stay', 'LateFee')");
                    table.CheckConstraint("CK_Payment_Method", "\"Method\" IN ('Cash', 'BankQR', 'Online')");
                    table.CheckConstraint("CK_Payment_Status", "\"Status\" IN ('Unpaid', 'Paid')");
                    table.ForeignKey(
                        name: "FK_Payment_AppUser_ConfirmedByUserId",
                        column: x => x.ConfirmedByUserId,
                        principalTable: "AppUser",
                        principalColumn: "UserId");
                    table.ForeignKey(
                        name: "FK_Payment_Appointment_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointment",
                        principalColumn: "AppointmentId");
                });

            migrationBuilder.CreateTable(
                name: "PaymentTransaction",
                columns: table => new
                {
                    TxnId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Gateway = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    TxnRef = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RequestedAmount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: false),
                    ConfirmedAmount = table.Column<decimal>(type: "numeric(12,0)", precision: 12, scale: 0, nullable: true),
                    Result = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    SignatureValid = table.Column<bool>(type: "boolean", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CallbackAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentTransaction", x => x.TxnId);
                    table.CheckConstraint("CK_PaymentTransaction_Gateway", "\"Gateway\" IN ('VNPAY', 'MoMo')");
                    table.CheckConstraint("CK_PaymentTransaction_Result", "\"Result\" IN ('Success', 'Failed')");
                    table.ForeignKey(
                        name: "FK_PaymentTransaction_Payment_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "Payment",
                        principalColumn: "PaymentId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointment_CustomerId",
                table: "Appointment",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointment_PetId",
                table: "Appointment",
                column: "PetId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointment_Status_SlotStart",
                table: "Appointment",
                columns: new[] { "Status", "SlotStart" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentStaff_StaffId",
                table: "AppointmentStaff",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_Cage_Code",
                table: "Cage",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_CostConfirmation_AppointmentId_Pending",
                table: "CostConfirmation",
                column: "AppointmentId",
                unique: true,
                filter: "\"Status\" = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_Customer_Phone",
                table: "Customer",
                column: "Phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Customer_UserId",
                table: "Customer",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payment_AppointmentId_Kind",
                table: "Payment",
                columns: new[] { "AppointmentId", "Kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PaymentTransaction_TxnRef",
                table: "PaymentTransaction",
                column: "TxnRef",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshToken_TokenHash",
                table: "RefreshToken",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshToken_UserId",
                table: "RefreshToken",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Staff_UserId",
                table: "Staff",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppointmentPhoto");

            migrationBuilder.DropTable(
                name: "AppointmentService");

            migrationBuilder.DropTable(
                name: "AppointmentStaff");

            migrationBuilder.DropTable(
                name: "CostConfirmation");

            migrationBuilder.DropTable(
                name: "HotelPricing");

            migrationBuilder.DropTable(
                name: "Notification");

            migrationBuilder.DropTable(
                name: "PaymentTransaction");

            migrationBuilder.DropTable(
                name: "RefreshToken");

            migrationBuilder.DropTable(
                name: "ServicePricing");

            migrationBuilder.DropTable(
                name: "SizeRule");

            migrationBuilder.DropTable(
                name: "SystemConfig");

            migrationBuilder.DropTable(
                name: "WeightTolerance");

            migrationBuilder.DropTable(
                name: "WorkShift");

            migrationBuilder.DropTable(
                name: "Payment");

            migrationBuilder.DropTable(
                name: "Service");

            migrationBuilder.DropTable(
                name: "Staff");

            migrationBuilder.DropTable(
                name: "Appointment");

            migrationBuilder.DropTable(
                name: "Cage");

            migrationBuilder.DropTable(
                name: "Pet");

            migrationBuilder.DropTable(
                name: "Customer");
        }
    }
}
