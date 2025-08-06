<?php

test('welcome page loads correctly', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertViewIs('welcome');
    $response->assertSee('Laravel');
});

test('welcome page contains expected elements', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertSee('header', false);
    $response->assertSee('footer', false);
});
