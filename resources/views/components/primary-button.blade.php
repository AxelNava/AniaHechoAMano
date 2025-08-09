<a href="{{$href}}"
   class="text-text-page text-center border-2 font-sans-serif @if($selected) bg-text-page border-text-page text-white @else border-secondary hover:bg-secondary @endif text-sm px-4 py-2 inline-block rounded-4xl transition-[color,background-color,translate] duration-200 hover:-translate-y-1">
    {{$slot}}
</a>
