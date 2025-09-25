<?php

use App\Http\Controllers\LandingController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'show'])->name('home');

Route::get('/up', static function () {
    return view('first_view');
});

Route::get("/search-products", static function () {
    return view('/SearchProduct');
})->name('search-products');
