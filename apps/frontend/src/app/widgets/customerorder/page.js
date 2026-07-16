'use server'
export default function WidgetPage() {
    console.log()
    return (
        <div>
            <h1>Customer Order widget</h1>
            {Array.from({ length: 100 }, (_, i) => (
                <p key={i}>{i * Math.random()}</p>
            ))}
        </div>
    );
}