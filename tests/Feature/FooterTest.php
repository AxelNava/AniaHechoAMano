<?php

test('footer is visible on welcome page', function () {
    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertSee('footer', false);
});

test('footer contains all required links', function () {
    $response = $this->get('/');

    // Check for product links
    $response->assertSee('Piñatas', false);
    $response->assertSee('Adornos', false);
    $response->assertSee('Papelería creativa', false);
    $response->assertSee('Cajas sorpresa', false);

    // Check for service links
    $response->assertSee('Ramos florales y artificiales', false);
    $response->assertSee('Desayunos', false);
    $response->assertSee('Fotos polaroid', false);

    // Check for important information links
    $response->assertSee('Política de pedidos', false);
    $response->assertSee('Política de privacidad', false);

    // Check for contact links
    $response->assertSee('Atliaca, Gro.', false);

    // Check for social media links
    $response->assertSee('Facebook', false);
    $response->assertSee('TikTok', false);
});

test('footer links should have href attributes', function () {
    // This test verifies that links in the footer have href attributes
    $response = $this->get('/');

    // Check that links have href attributes (negative test)
    $response->assertDontSee('<a href="">', false);

    // Check for specific link text with href attributes
    $response->assertSee('<a href=', false);
});
