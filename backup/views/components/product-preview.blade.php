<article
    class="grid md:grid-cols-2 gap-4 rounded border-2 bg-rose-400 hover:border-amber-300 transition-colors duration-300 "
    id="container-prod-{{$productId}}"
>
    <img src="{{$imageDirection}}" alt="image">
    <section id="product-card-{{$productId}}">
        <a href="{{$productId}}" class="hover:underline">{{$productName}}</a>
        <label>{{$price}}</label>
        <p>{{$description}}</p>
        p
    </section>
</article>

<script type="module">
    let card = document.querySelector("#container-prod-{{$productId}}")
    card.addEventListener("mouseover", (e) => {
        let url = e.target.querySelector("section>a");
        if (!url) return;


        const mouseOverEvent = new MouseEvent("mouseenter", {

        })
        url.dispatchEvent(mouseOverEvent)
    })
</script>
