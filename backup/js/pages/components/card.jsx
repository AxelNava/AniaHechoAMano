import {useState} from 'react'

export default function Card({title, tags, className, classNameImg, urlTarget, imageSrc, children}) {

    let tagsElements = (tagsE) => {
        let arrayTags = Object.values(tagsE)

        return arrayTags.map((tag, index) => <span
            className={"bg-primary text-xs font-[600] bold text-text-page font-inter-var rounded-2xl p-2 px-6"}
            key={index}>
            {tag}
        </span>)
    }

    return (
        <div
            className={`rounded-2xl relative shadow-[0_0_30px_20px_rgb(0_0_0/_0.1),0_0px_10px_-6px_rgb(0_0_0/_0.1)]` +
                ` grid grid-rows-subgrid hover:shadow-primary hover:cursor-pointer ` +
                `hover:[&>div>span]:-translate-y-10 hover:[&>div>span]:underline hover:[&>div>span]:opacity-100 hover:[&>div>img]:blur-[1px] hover:[&_h3>a]:underline` +
                ` transition-[color,box-shadow,background-color] duration-300 ${className || ''}`}
        >
            <div className={`overflow-hidden relative aspect-video rounded-t-2xl`}>
                <img src={imageSrc} alt=""
                     className={`bg-purple-300  ease-in-out transition-[filter] duration-200  ${classNameImg || ''}`}/>
                <span
                    className={"opacity-0 absolute transition-all top-1/2 inset-x-2/8 text-center bg-text-page text-white rounded-2xl p-2"}
                    aria-describedby={'my-id-' + title}>Ver detalles -></span>
            </div>
            <div className="px-8 h-min container pb-4">
                <h3 className={"text-[1.3cqi] font-inter-var text-text-page font-[600]"}
                    id={"my-id-" + title}>
                    <a href=""
                       className={"after:absolute after:inset-0 after:content-[''] after:z-10"}
                    >{title}</a></h3>
                <span className={"hidden font-inter-var text-text-page2 max-md:inline text-sm leading-10 opacity-90 "}>Ver detalles -></span>
                <p className={"text-text-page2 my-4 text-base font-inter-var"}>{children}</p>
                <div className={" flex flex-wrap flex-row gap-2"}>{tagsElements(tags)}</div>
            </div>
        </div>
    )
}
