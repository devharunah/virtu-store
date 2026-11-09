# Cloudinary setup: seller banners and phone photos

Sellers upload a shop banner and real photos of their phones. The images live on
[Cloudinary](https://cloudinary.com)'s free plan; Firestore stores only each image's URL.

Firebase Storage isn't used because new Firebase projects need the pay-as-you-go Blaze plan for it,
and this project stays on the free Spark plan.

## How an upload works

1. The seller picks an image in `/sell`.
2. The browser shrinks it (longest side 1600 px, WebP) in `src/lib/image-resize.ts`.
3. The browser posts it straight to Cloudinary with an **unsigned upload preset**
   (`src/lib/cloudinary.ts`). No server of ours is involved.
4. Cloudinary returns a `https://res.cloudinary.com/<cloud>/image/upload/...` URL, which is saved
   with the shop.
5. Pages ask Cloudinary for a resized copy by adding a transform to the URL (`cldUrl` in
   `src/lib/image-url.ts`), e.g. `w_720,h_240,c_fill,f_auto,q_auto` for a directory card.

`src/lib/shop-schema.ts` and `firestore.rules` accept only URLs of that shape, so a shop can't
point shoppers' browsers at another site.

Without the two variables below, the image pickers in `/sell` are hidden and everything else works.

## Connect an account

1. Sign up at <https://cloudinary.com/users/register_free> (no card needed).
2. On the dashboard, note your **Cloud name**.
3. Go to **Settings → Upload → Upload presets → Add upload preset**:
   - **Signing mode:** Unsigned
   - **Preset name:** e.g. `virtu_unsigned`
   - **Asset folder:** `virtu`
   - **Allowed formats:** `jpg,png,webp`
   - **Max file size:** 5 MB (5000000 bytes)
   - **Incoming transformation:** `c_limit,w_1600,h_1600` (stores at most 1600 px)
   - Leave **Use filename** off, so names are random.
   - Save.
4. Put both values in `.env.local`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud name>
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=virtu_unsigned
   ```
5. In Vercel, add the same two variables for Production and Preview, then redeploy.

## Trade-offs

- **Anyone with the preset name can upload to it.** The name ships to every browser, as unsigned
  presets do. The preset's limits (format, size, dimensions, folder) bound the damage, and
  nothing uploaded appears on the site unless an owner saves its URL in their shop. If abuse
  shows up, rename the preset, or move uploads behind a signed server route.
- **Replaced or removed images stay in Cloudinary.** Deleting needs a signed API call, which this
  client-only setup doesn't make. Clean up from the Cloudinary media library if storage grows.
- **The free plan** includes 25 monthly credits (1 credit = 1 GB of storage, 1 GB of bandwidth or
  1,000 transformations). That is plenty for a demo.
