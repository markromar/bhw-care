// Live check of Realtime authorization using the demo BHW account.
// Run from the PowerShell block in the instructions; it reads its settings from
// environment variables and prints only statuses.
const { createClient } = require('@supabase/supabase-js');

const url = process.env.CHECK_URL;
const key = process.env.CHECK_KEY;
const password = process.env.CHECK_PW;

const FINAL_STATUSES = ['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'];

function tryJoin(supabase, topic) {
  return new Promise((resolve) => {
    let finished = false;
    let timer;

    const channel = supabase.channel(topic, { config: { private: true } });

    function finish(result) {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      resolve(result);
      // Remove the channel after this callback returns, so removal cannot re-enter it.
      setTimeout(() => {
        void supabase.removeChannel(channel);
      }, 0);
    }

    timer = setTimeout(() => finish('NO_ANSWER'), 10000);

    channel
      .on('broadcast', { event: 'notification' }, () => undefined)
      .subscribe((status) => {
        if (FINAL_STATUSES.includes(status)) {
          finish(status);
        }
      });
  });
}

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo.bhw@example.com',
    password,
  });
  if (error) {
    console.log('sign-in failed');
    process.exit(1);
  }

  await supabase.realtime.setAuth(data.session.access_token);

  console.log('own topic: ' + (await tryJoin(supabase, `user:${data.user.id}`)));
  console.log(
    "another user's topic: " +
      (await tryJoin(supabase, 'user:00000000-0000-4000-8000-000000000000')),
  );
  console.log('unrelated topic: ' + (await tryJoin(supabase, 'some-other-topic')));

  await supabase.auth.signOut();
  process.exit(0);
}

main();
