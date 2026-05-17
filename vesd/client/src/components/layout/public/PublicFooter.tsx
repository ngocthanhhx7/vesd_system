import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { footerColumns } from './publicNavigation';

export function PublicFooter() {
  return (
    <footer className="rounded-t-[36px] bg-brand py-16 text-white md:py-20">
      <div className="container-page grid gap-10 md:grid-cols-5">
        {footerColumns.map((column) => <FooterColumn key={column.title + column.items[0]} title={column.title} items={column.items} />)}
        <div>
          <h3 className="text-base font-bold">Theo dõi chúng tôi</h3>
          <div className="mt-5 flex gap-5"><Instagram size={19} /><Facebook size={18} /><Youtube size={21} /><Linkedin size={18} /></div>
          <h3 className="mt-14 text-base font-bold">Ứng dụng di động</h3>
          <div className="mt-5 space-y-3 text-base text-soft"><a className="block underline" href="#">Android</a><a className="block underline" href="#">iOS</a></div>
        </div>
      </div>
      <div className="container-page mt-20">
        <img src="/assets/vesd-logo-white.svg" alt="VESD" className="mx-auto h-auto w-[min(760px,92%)]" />
        <div className="mt-12 flex flex-col justify-between gap-4 text-base text-soft md:flex-row">
          <p>© 2026 - Bản quyền thuộc Six Sense Startup</p>
          <p>English&nbsp; | &nbsp;<strong className="text-white">Tiếng Việt</strong></p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-base font-bold leading-tight">{title}</h3>
      <ul className="mt-6 space-y-4 text-base text-soft">
        {items.map((item) => <li key={item}><Link className="hover:text-white" to="/designers">{item}</Link></li>)}
      </ul>
    </div>
  );
}
