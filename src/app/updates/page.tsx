import { subscribeNewsletter } from "@/app/actions/communications";

export default function UpdatesPage() {
  return (
    <main>
      <section className="bg-[#fff0f1] px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Petra Academy</p>
          <h1 className="page-title max-w-3xl">News and updates</h1>
          <p className="page-subtitle">Stay connected with Petra Academy, Awka and Nnewi.</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="text-xl font-black">Latest news</h2>
          <p className="empty-state card mt-4">There are no news updates at this time. Please check back later.</p>
        </section>
        <aside>
          <section className="card p-5">
            <h2 className="font-black">School newsletter</h2>
            <p className="mt-1 text-sm text-[#68707d]">Join the subscriber list for future approved updates.</p>
            <form action={subscribeNewsletter} className="mt-3 grid gap-2">
              <input name="name" placeholder="Name (optional)" />
              <input name="email" type="email" placeholder="Email address" required />
              <button className="button" type="submit">Subscribe</button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
