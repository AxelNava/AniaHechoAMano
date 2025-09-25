<?php

/**
 * Test para verificar que en la página principal se puede ver el footer y que contiene
 * todos los enlaces correspondientes para cada elemento con un "<a>", para que cada
 * enlace redireccione a su página correspondiente.
 *
 * Este test verifica:
 * 1. Que la página principal carga correctamente (status 200)
 * 2. Que el footer está presente en la página
 * 3. Que todos los textos de los enlaces están presentes
 * 4. Que existen elementos <a> con atributos href para la redirección
 */
test('footer is visible and contains links', function () {
    $response = $this->get('/');

    // Check that the page loads successfully
    $response->assertStatus(200);

    // Check that the footer is present
    $response->assertSee('footer', false);

    // Check for the presence of link text in the footer
    $response->assertSee('Piñatas', false);
    $response->assertSee('Adornos', false);
    $response->assertSee('Papelería creativa', false);
    $response->assertSee('Cajas sorpresa', false);
    $response->assertSee('Ramos florales y artificiales', false);
    $response->assertSee('Desayunos', false);
    $response->assertSee('Fotos polaroid', false);
    $response->assertSee('Política de pedidos', false);
    $response->assertSee('Política de privacidad', false);
    $response->assertSee('Facebook', false);
    $response->assertSee('TikTok', false);

    // Check for the presence of links
    $response->assertSee('<a', false);
    $response->assertSee('href=', false);
});
