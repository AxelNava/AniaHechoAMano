<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

final class LandingController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('welcome', [

        ]);
    }
}
