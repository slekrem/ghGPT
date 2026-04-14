using System.Text.Json;
using ghGPT.Core.Repositories;

namespace ghGPT.Core.Tests;

public class CheckoutStrategyTests
{
    [Theory]
    [InlineData(CheckoutStrategy.Normal, "Normal")]
    [InlineData(CheckoutStrategy.Carry, "Carry")]
    [InlineData(CheckoutStrategy.Stash, "Stash")]
    [InlineData(CheckoutStrategy.Discard, "Discard")]
    public void CheckoutStrategy_SerializesAsString(CheckoutStrategy strategy, string expected)
    {
        var json = JsonSerializer.Serialize(strategy);

        Assert.Equal($"\"{expected}\"", json);
    }

    [Theory]
    [InlineData("Normal", CheckoutStrategy.Normal)]
    [InlineData("Carry", CheckoutStrategy.Carry)]
    [InlineData("Stash", CheckoutStrategy.Stash)]
    [InlineData("Discard", CheckoutStrategy.Discard)]
    public void CheckoutStrategy_DeserializesFromString(string json, CheckoutStrategy expected)
    {
        var result = JsonSerializer.Deserialize<CheckoutStrategy>($"\"{json}\"");

        Assert.Equal(expected, result);
    }

    [Fact]
    public void CheckoutStrategy_HasFourValues()
    {
        var values = Enum.GetValues<CheckoutStrategy>();

        Assert.Equal(4, values.Length);
    }

    [Fact]
    public void CheckoutStrategy_Normal_IsDefault()
    {
        Assert.Equal(0, (int)CheckoutStrategy.Normal);
    }
}
