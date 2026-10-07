"""Build the small offline lunar landmark selection from the official USGS KMZ."""
import argparse
import datetime
import hashlib
import io
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

SOURCE = 'https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.kmz'
NAMES = {
    'Tycho': '第谷环形山', 'Copernicus': '哥白尼环形山', 'Plato': '柏拉图环形山',
    'Aristarchus': '阿里斯塔克环形山', 'Kepler': '开普勒环形山', 'Clavius': '克拉维乌斯环形山',
    'Eratosthenes': '埃拉托色尼环形山', 'Archimedes': '阿基米德环形山', 'Ptolemaeus': '托勒密环形山',
    'Alphonsus': '阿方索环形山', 'Arzachel': '阿尔扎赫勒环形山', 'Aristoteles': '亚里士多德环形山',
    'Eudoxus': '欧多克索斯环形山', 'Gassendi': '伽桑狄环形山', 'Langrenus': '朗格伦环形山',
    'Petavius': '佩塔维乌斯环形山', 'Grimaldi': '格里马尔迪环形山', 'Schickard': '席卡德环形山',
    'Tsiolkovskiy': '齐奥尔科夫斯基环形山', 'Korolev': '科罗廖夫环形山',
    'Von Kármán': '冯·卡门环形山', 'King': '金环形山', 'Hertzsprung': '赫茨普龙环形山',
    'Mendeleev': '门捷列夫环形山', 'Bailly': '贝利环形山', 'Schrödinger': '薛定谔环形山',
    'Mare Imbrium': '雨海', 'Mare Serenitatis': '澄海', 'Mare Tranquillitatis': '静海',
    'Mare Fecunditatis': '丰富海', 'Mare Nectaris': '酒海', 'Mare Crisium': '危海',
    'Mare Nubium': '云海', 'Mare Humorum': '湿海', 'Mare Frigoris': '冷海',
    'Oceanus Procellarum': '风暴洋', 'Sinus Iridum': '虹湾', 'Mare Orientale': '东方海',
    'Mare Moscoviense': '莫斯科海', 'Mare Ingenii': '智海',
}

def extract(data):
    ns = {'k': 'http://www.opengis.net/kml/2.2'}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        root = ET.fromstring(archive.read('MOON_nomenclature_center_pts.kml'))
    found = {}
    for node in root.findall('.//k:Placemark', ns):
        name = node.findtext('k:name', namespaces=ns)
        if name not in NAMES:
            continue
        fields = {s.attrib['name']: s.text for s in node.findall('.//k:SimpleData', ns)}
        assert name not in found and fields['approval'] == 'Adopted by IAU', name
        lon, lat = map(float, node.findtext('k:Point/k:coordinates', namespaces=ns).split(','))
        assert abs(lat-float(fields['center_lat'])) < .0001
        assert abs((lon-float(fields['center_lon'])+180) % 360-180) < .0001
        kind = {'AA': 'crater', 'ME': 'mare', 'OC': 'ocean', 'SI': 'bay'}[fields['code']]
        found[name] = {'id': int(fields['link'].rsplit('/', 1)[1]), 'name': NAMES[name], 'en': name,
                       'lat': round(lat, 2), 'lon': round(lon, 2), 'diameter': round(float(fields['diameter']), 2), 'kind': kind}
    assert set(found) == set(NAMES), sorted(set(NAMES)-set(found))
    return [found[name] for name in NAMES]

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=pathlib.Path, help='Previously downloaded official KMZ')
    args = parser.parse_args()
    data = args.input.read_bytes() if args.input else urllib.request.urlopen(SOURCE, timeout=60).read()
    features = extract(data)
    root = pathlib.Path(__file__).resolve().parents[1]
    (root/'app/src/main/assets/moon-features-data.js').write_text(
        '// USGS/IAU lunar feature centers; Chinese display translations by Starlight.\n'
        'const MOON_FEATURE_DATA='+json.dumps(features, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
    provenance = {'source': SOURCE, 'retrieved': datetime.date.today().isoformat(), 'source_sha256': hashlib.sha256(data).hexdigest(),
                  'coordinate_system': 'planetocentric latitude; east-positive longitude normalized to -180..180',
                  'precision': 'rounded to two decimal degrees and two decimal km', 'feature_count': len(features)}
    (root/'licenses/moon-features-source.json').write_text(json.dumps(provenance, indent=2)+'\n', encoding='utf-8')
    print(f'Prepared {len(features)} lunar features; source SHA256 {provenance["source_sha256"]}')
