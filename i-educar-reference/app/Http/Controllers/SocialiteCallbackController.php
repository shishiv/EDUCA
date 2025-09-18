<?php

namespace App\Http\Controllers;

use App\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class SocialiteCallbackController
{
    public function __invoke()
    {
        $socialite = Socialite::driver('passport')->user();

        $email = $socialite->getEmail();

        $user = User::query()->whereHas('employee', function ($query) use ($email) {
            $query->where('email', $email);
        })->first();

        if (empty($email) || empty($user)) {
            return redirect('/login')->withErrors([
                'login' => 'Usuário não encontrado.',
            ]);
        }

        if ($user->isInactive()) {
            return redirect('/login')->withErrors([
                'login' => $user->employee->motivo ?: __('auth.inactive'),
            ]);
        }

        Auth::login($user);

        return redirect()->intended();
    }
}
