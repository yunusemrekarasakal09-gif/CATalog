
export default function KvkkPage() {
  return (
    <main className="min-h-screen bg-[#f8f5fc] px-5 py-12 text-[#302442]">
      <article className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <a href="/" className="text-sm text-purple-700 hover:underline">
          ← CATalog ana sayfa
        </a>

        <h1 className="mt-6 text-3xl font-bold">
          KVKK Aydınlatma Metni
        </h1>

        <p className="mt-3 text-sm text-gray-500">
          Son güncelleme: 08.11.2026
        </p>

        <p className="mt-6 leading-7">
          Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin
          Korunması Kanunu kapsamında CATalog platformunda
          gerçekleştirilen kişisel veri işleme faaliyetleri
          hakkında kullanıcıları bilgilendirmek amacıyla
          hazırlanmıştır.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">1. Veri Sorumlusu</h2>
          <p className="leading-7">
            Ad Soyad: Yunus Emre Karasakal
            <br />
            Platform: CATalog
            <br />
            İnternet sitesi: https://www.birmiyav.com
            <br />
            İletişim e-posta adresi: [E-POSTA ADRESİ EKLENECEK]
            <br />
            İletişim adresi: [TEBLİGAT ADRESİ EKLENECEK]
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">2. İşlenen Kişisel Veriler</h2>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Hesap ve profil bilgileri</li>
            <li>E-posta ve isteğe bağlı telefon numarası</li>
            <li>Kedi ilanları, fotoğraflar ve şehir bilgisi</li>
            <li>Mesajlar, favoriler ve değerlendirmeler</li>
            <li>Şikâyet ve engelleme kayıtları</li>
            <li>Güvenlik ve teknik işlem kayıtları</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">3. Kişisel Verilerin İşlenme Amaçları</h2>
          <ul className="list-disc space-y-2 pl-6 leading-7">
            <li>Üyelik ve hesap yönetimi</li>
            <li>Kedi ilanlarının oluşturulması ve yayımlanması</li>
            <li>Kullanıcılar arasında iletişim sağlanması</li>
            <li>Favori ve değerlendirme hizmetlerinin sunulması</li>
            <li>Şikâyetlerin incelenmesi</li>
            <li>Kötüye kullanımın ve yetkisiz erişimin önlenmesi</li>
            <li>Platform güvenliğinin sağlanması</li>
            <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">4. Hukuki Sebepler</h2>
          <p className="leading-7">
            Kişisel veriler, KVKK'nın 5. maddesinde belirtilen
            hukuki sebepler kapsamında; sözleşmenin kurulması
            veya ifası, hukuki yükümlülüklerin yerine getirilmesi,
            bir hakkın tesisi, kullanılması veya korunması,
            veri sorumlusunun meşru menfaati ve gerekli
            durumlarda açık rıza hukuki sebeplerine dayanılarak
            işlenebilir. Her veri işleme faaliyeti için uygun
            hukuki sebep ayrıca değerlendirilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">5. Kişisel Verilerin Aktarılması</h2>
          <p className="leading-7">
            Kişisel veriler, hizmetin sunulması ve güvenliğinin
            sağlanması için gerekli olduğu ölçüde teknik altyapı,
            barındırma, veritabanı ve depolama hizmeti
            sağlayıcılarına aktarılabilir. Kanunen yetkili
            kamu kurumları ve adli mercilerle mevzuatın
            gerektirdiği durumlarda paylaşılabilir.
          </p>
          <p className="leading-7">
            CATalog'un Supabase ana veritabanı Japonya'nın
            Tokyo bölgesinde bulunmaktadır. Bu nedenle
            yurt dışına kişisel veri aktarımı söz konusu olabilir.
            Aktarım, KVKK'nın 9. maddesinde belirtilen şartlar
            ve uygun güvenceler sağlanarak gerçekleştirilmelidir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">6. Telefon Numarası ve İletişim Tercihi</h2>
          <p className="leading-7">
            Telefon numarası vermek zorunlu değildir.
            Kullanıcı telefonla aranma seçeneğini etkinleştirirse
            telefon numarasını ilanında diğer kullanıcılara
            gösterebilir. Bu tercih reklam, kampanya veya
            pazarlama iletilerine izin verildiği anlamına gelmez.
            Kullanıcı tercihini sonradan değiştirebilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">7. Kişisel Verilerin Saklanması</h2>
          <p className="leading-7">
            Kişisel veriler, işleme amaçları için gerekli süre
            boyunca ve ilgili mevzuatta öngörülen saklama
            süreleri dikkate alınarak muhafaza edilir.
            Saklama süresi sona eren veriler, mevzuata uygun
            şekilde silinir, yok edilir veya anonim hâle getirilir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">8. KVKK Kapsamındaki Haklarınız</h2>
          <p className="leading-7">
            KVKK'nın 11. maddesi kapsamında kullanıcılar;
            kişisel verilerinin işlenip işlenmediğini öğrenme,
            işlenmişse bilgi talep etme, işleme amacını öğrenme,
            verilerin aktarıldığı kişileri bilme, eksik veya
            yanlış verilerin düzeltilmesini isteme, kanuni
            şartlarla verilerin silinmesini veya yok edilmesini
            isteme ve kanunda belirtilen diğer haklarını
            kullanma hakkına sahiptir.
          </p>
          <p className="leading-7">
            Başvurular aşağıdaki iletişim adresinden iletilebilir:
            <br />
            [KVKK BAŞVURU E-POSTA ADRESİ EKLENECEK]
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-bold">9. Başvuruların Değerlendirilmesi</h2>
          <p className="leading-7">
            KVKK kapsamındaki başvurular, mevzuatta belirtilen
            usul ve süreler çerçevesinde değerlendirilir.
            Başvurunun niteliğine göre kimlik doğrulaması
            talep edilebilir.
          </p>
        </section>

        <footer className="mt-10 border-t pt-5 text-sm text-gray-500">
          <p>© 2026 CATalog – birmiyav.com</p>
          <p>Veri Sorumlusu: Yunus Emre Karasakal</p>
        </footer>
      </article>
    </main>
  );
}
