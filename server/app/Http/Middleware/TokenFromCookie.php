<?php
// app/Http/Middleware/TokenFromCookie.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class TokenFromCookie
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->bearerToken() && $request->cookie('access_token')) {
            $request->headers->set(
                'Authorization',
                'Bearer ' . $request->cookie('access_token')
            );
        }
        return $next($request);
    }
}
