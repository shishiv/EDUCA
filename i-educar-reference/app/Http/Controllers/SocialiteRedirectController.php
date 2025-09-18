<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Facades\Socialite;

class SocialiteRedirectController
{
    public function __invoke(): RedirectResponse
    {
        return Socialite::driver('passport')->redirect();
    }
}
