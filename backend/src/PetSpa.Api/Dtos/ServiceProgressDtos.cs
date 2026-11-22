namespace PetSpa.Api.Dtos;

public sealed record ServiceProgressRequest(bool? IsDone, string? Note);
