using ghGPT.Api.Models;
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
            return NotFound(new { error = "Kein GitHub-Account verbunden." });
        return Ok(account);
    }

    [HttpPost("token")]
    public async Task<ActionResult<AccountInfo>> SaveToken([FromBody] SaveTokenRequest request)
    {
        try
        {
            var account = await accountService.SaveTokenAsync(request.Token);
            return Ok(account);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete]
    public IActionResult RemoveAccount()
    {
        accountService.RemoveAccount();
        return NoContent();
    }
}
