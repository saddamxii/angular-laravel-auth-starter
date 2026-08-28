<?php

namespace Tests\Feature;

use Tests\TestCase;

class BrandingTest extends TestCase
{
    public function test_public_branding_returns_only_valid_safe_values(): void
    {
        config()->set('branding.name', 'Example Platform');
        config()->set('branding.short_name', 'EP');
        config()->set('branding.logo_url', 'https://cdn.example.test/logo.svg');
        config()->set('branding.theme', 'dark');
        config()->set('branding.primary_color', '#123abc');
        config()->set('branding.accent_color', 'not-a-colour');

        $this->getJson('/api/branding')
            ->assertOk()
            ->assertJsonPath('name', 'Example Platform')
            ->assertJsonPath('short_name', 'EP')
            ->assertJsonPath('logo_url', 'https://cdn.example.test/logo.svg')
            ->assertJsonPath('theme', 'dark')
            ->assertJsonPath('primary_color', '#123abc')
            ->assertJsonPath('accent_color', '#138460');
    }
}
