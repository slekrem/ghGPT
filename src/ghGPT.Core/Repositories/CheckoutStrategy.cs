using System.Text.Json.Serialization;

namespace ghGPT.Core.Repositories;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CheckoutStrategy
{
    Normal,
    Carry,
    Stash,
    Discard
}
