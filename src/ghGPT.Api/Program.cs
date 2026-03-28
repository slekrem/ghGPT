using ghGPT.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddHttpForwarder();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

if (!app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// SignalR and API routes must be mapped before the SPA catch-all
app.MapHub<RepositoryHub>("/hubs/repository");

if (app.Environment.IsDevelopment())
{
    // Proxy all unmatched requests to the Vite dev server (HMR included)
    app.MapForwarder("/{**catch-all}", "http://localhost:5173");
}
else
{
    app.MapFallbackToFile("index.html");
}

app.Run();

public partial class Program { }
