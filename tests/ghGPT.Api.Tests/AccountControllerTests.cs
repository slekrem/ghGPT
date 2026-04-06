using ghGPT.Api.Controllers;
using ghGPT.Core.Account;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

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
}
