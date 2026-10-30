using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PetSpa.Domain.Entities;
using PetSpa.Domain.Enums;

namespace PetSpa.Infrastructure.Persistence.Configurations;

public class PaymentTransactionConfiguration : IEntityTypeConfiguration<PaymentTransaction>
{
    public void Configure(EntityTypeBuilder<PaymentTransaction> b)
    {
        b.ToTable("PaymentTransaction", t =>
        {
            t.HasCheckConstraint("CK_PaymentTransaction_Gateway", CheckSql.In<PaymentGateway>("Gateway"));
            t.HasCheckConstraint("CK_PaymentTransaction_Result", CheckSql.In<TransactionResult>("Result"));
        });
        b.HasKey(x => x.TxnId);

        b.Property(x => x.Gateway).HasConversion<string>().HasMaxLength(10).IsRequired();
        b.Property(x => x.TxnRef).HasMaxLength(64).IsRequired();
        b.Property(x => x.RequestedAmount).HasPrecision(12, 0);
        b.Property(x => x.ConfirmedAmount).HasPrecision(12, 0);
        b.Property(x => x.Result).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.CreatedAt).IsRequired();

        b.HasIndex(x => x.TxnRef).IsUnique();

        b.HasOne<Payment>().WithMany().HasForeignKey(x => x.PaymentId);
    }
}

