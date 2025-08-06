<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/up', function () {
    return view('first_view');
});

Route::get("/search-products", function () {
    return view('/SearchProduct');
})->name('search-products');
