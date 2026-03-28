using ghGPT.Api.Endpoints;
using ghGPT.Api.Hubs;
using ghGPT.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddInfrastructure();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapHub<RepositoryHub>("/hubs/repository");
app.MapRepositoryEndpoints();

app.Run();

public partial class Program { }
