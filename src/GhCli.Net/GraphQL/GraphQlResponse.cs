namespace GhCli.Net.GraphQL;

internal class GraphQlResponse<T>
{
    public T? Data { get; init; }
}
