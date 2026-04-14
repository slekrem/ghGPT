using ghGPT.Ai;
using ghGPT.Api.Hubs;
using ghGPT.Api.Middleware;
using ghGPT.Core.Repositories;
using ghGPT.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IRepositoryEventNotifier, RepositoryEventNotifier>();
builder.Services.AddInfrastructure();
builder.Services.AddAiServices();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<RepositoryHub>("/hubs/repository");

app.Run();

public partial class Program { }
