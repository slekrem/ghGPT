using ghGPT.Api.Controllers;
using ghGPT.Api.Models;
using ghGPT.Core.Account;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace ghGPT.Api.Tests;

public class AccountControllerTests
{
    private readonly IAccountService _service = Substitute.For<IAccountService>();
    private readonly AccountController _controller;

    public AccountControllerTests()
    {
        _controller = new AccountController(_service);
    }

    private static AccountInfo MakeAccount() =>
        new("octocat", "The Octocat", "https://github.com/images/error/octocat_happy.gif");

    // --- GetAccount ---

    [Fact]
    public async Task GetAccount_ReturnsOkWithAccount_WhenConnected()
    {
        _service.GetAccountAsync().Returns(MakeAccount());

        var result = await _controller.GetAccount();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var account = Assert.IsType<AccountInfo>(ok.Value);
        Assert.Equal("octocat", account.Login);
    }

    [Fact]
    public async Task GetAccount_ReturnsNotFound_WhenNoAccount()
    {
        _service.GetAccountAsync().Returns((AccountInfo?)null);

        var result = await _controller.GetAccount();

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    // --- SaveToken ---

    [Fact]
    public async Task SaveToken_ReturnsOkWithAccount_WhenTokenValid()
    {
        var request = new SaveTokenRequest("ghp_validtoken");
        _service.SaveTokenAsync("ghp_validtoken").Returns(MakeAccount());

        var result = await _controller.SaveToken(request);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<AccountInfo>(ok.Value);
    }

    [Fact]
    public async Task SaveToken_ReturnsBadRequest_WhenTokenInvalid()
    {
        var request = new SaveTokenRequest("invalid");
        _service.SaveTokenAsync("invalid")
            .ThrowsAsync(new InvalidOperationException("Der Token ist ungültig oder abgelaufen."));

        var result = await _controller.SaveToken(request);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // --- RemoveAccount ---

    [Fact]
    public void RemoveAccount_ReturnsNoContent()
    {
        var result = _controller.RemoveAccount();

        Assert.IsType<NoContentResult>(result);
        _service.Received(1).RemoveAccount();
    }
}
