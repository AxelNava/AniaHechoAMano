<?php

namespace App\View\Components;

use Closure;
use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

final class ProductPreview extends Component
{
    public function __construct(
        public string $productName,
        public string $productId,
        public string $description,
        public string $price,
        public ?string $url,
        public string $imageDirection
    )
    {
        //
    }

    /**
     * Get the view / contents that represent the component.
     */
    public function render(): View|Closure|string
    {
        return view('components.product-preview');
    }
}
