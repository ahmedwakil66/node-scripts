import youtubedl from 'youtube-dl-exec';

youtubedl('https://www.youtube.com/watch?v=UM8KmlrppPg', {
  dumpJson: true,
  noCheckCertificates: true,
  noWarnings: true,
  preferFreeFormats: true,
  addHeader: [
    'referer:youtube.com',
    'user-agent:Mozilla/5.0'
  ]
}).then(output => console.log("Formats:", output.formats.length)).catch(console.error);
