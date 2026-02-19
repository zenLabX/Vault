# Request Flow

Client 發送 Request (帶 JWT)

-> Middleware Pipeline
    -> UseAuthentication()
    -> 建立 ClaimsPrincipal
    -> UseAuthorization()
        -> 檢查 Policy
-> Controller


補專案實作