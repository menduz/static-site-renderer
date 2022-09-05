# site-renderer

```bash
npx static-site-renderer --srcDir . --outDir out --publicUrl https://menduz.com
```

It works with a folder structure like this one

```
src-folder
├── about.md              <--- source file
├── index.html            <--- source file
├── main.scss             <--- source file
└── .site-generator       <- (all things starting with . are ignored)
    ├── public            <- static files folder
    |   ├── favicon.png   <--- static file
    |   └── robots.txt    <--- static file
    └── layouts           <- reusable layouts
        ├── home.html     <--- layout for home site
        └── post.html     <--- layout for posts
```