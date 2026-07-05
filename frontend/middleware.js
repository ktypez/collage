export default function middleware(request) {
  const { pathname } = new URL(request.url);
  if (pathname !== '/liff' && !pathname.startsWith('/liff/')) {
    return Response.redirect('https://liff.line.me/2010606328-7UnH1Yre', 301);
  }
}
