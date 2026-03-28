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

app.MapHub<RepositoryHub>("/hubs/repository");

if (app.Environment.IsDevelopment())
{
    app.MapForwarder("/{**catch-all}", "http://localhost:5173");
}
else
{
    app.MapFallbackToFile("index.html");
}

app.Run();
