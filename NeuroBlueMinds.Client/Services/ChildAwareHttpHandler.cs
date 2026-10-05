// NeuroBlueMinds.Client/Services/ChildAwareHttpHandler.cs — NEW FILE
// DelegatingHandler that automatically uses childToken when present,
// falling back to authToken (parent token) when not in a child session.
// This means ZERO changes to DashboardService, DashboardController, or any
// existing endpoint — the server just sees a userId from the JWT.

using Microsoft.JSInterop;

public class ChildAwareHttpHandler : DelegatingHandler
{
    private readonly IJSRuntime _js;

    public ChildAwareHttpHandler(IJSRuntime js) => _js = js;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            // childToken is set when a parent has selected a child profile
            // authToken is the parent's own token
            var childToken = await _js.InvokeAsync<string?>("localStorage.getItem", "childToken");
            var authToken  = await _js.InvokeAsync<string?>("localStorage.getItem", "authToken");

            var token = !string.IsNullOrEmpty(childToken) ? childToken : authToken;

            if (!string.IsNullOrEmpty(token))
                request.Headers.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }
        catch { /* JS not available during SSR — skip */ }

        return await base.SendAsync(request, cancellationToken);
    }
}
