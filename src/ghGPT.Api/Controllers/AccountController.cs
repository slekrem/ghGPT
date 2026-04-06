using ghGPT.Core.Account;
using Microsoft.AspNetCore.Mvc;

namespace ghGPT.Api.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController(IAccountService accountService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AccountInfo>> GetAccount()
    {
        var account = await accountService.GetAccountAsync();
        if (account is null)
            return NotFound(new { error = "Kein GitHub-Account verbunden. Bitte 'gh auth login' ausführen." });
        return Ok(account);
    }
}
