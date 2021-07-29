import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { Header } from '../../components/Header';
import { PreviewButton } from '../../components/PreviewButton';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost: {
    uid: string;
    title: string;
  };
  prevPost: {
    uid: string;
    title: string;
  };
}

export default function Post({ post, preview, nextPost, prevPost }: PostProps) {
  const router = useRouter();

  const totalWords = post.data.content.reduce((acc, content) => {
    const words =
      content.heading.split(' ').length +
      RichText.asText(content.body).split(' ').length;

    return acc + words;
  }, 0);

  const timeToRead = `${String(Math.round(totalWords / 225) + 1)} min`;

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute('repo', 'jheanr/ignite-chapter3-challenge');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }, []);

  if (router.isFallback) {
    return <p>Carregando...</p>;
  }

  return (
    <>
      <div className={commonStyles.container}>
        <Header />
      </div>

      <div className={styles.banner}>
        <img src={post.data.banner.url} alt={post.data.title} />
      </div>

      <div className={commonStyles.container}>
        <h1 className={styles.postTitle}>{post.data.title}</h1>

        <div className={styles.postInfo}>
          <span>
            <FiCalendar />{' '}
            {format(new Date(post.first_publication_date), 'd MMM y', {
              locale: ptBR,
            })}
          </span>

          <span>
            <FiUser />
            {post.data.author}
          </span>

          <span>
            <FiClock /> {timeToRead}
          </span>

          {post.last_publication_date && (
            <p className={styles.postEditInfo}>
              * editado em{' '}
              {format(
                new Date(post.first_publication_date),
                "d MMM y', às' HH:mm",
                {
                  locale: ptBR,
                }
              )}
            </p>
          )}
        </div>

        {post.data.content.map((content, index) => (
          <section className={styles.postContent} key={index}>
            <h2 className={styles.postContentHeading}>{content.heading}</h2>

            <div
              className={styles.postContentBody}
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </section>
        ))}

        <div className={styles.divider} />

        {(prevPost.uid || nextPost.uid) && (
          <div className={styles.postsNavigation}>
            {prevPost.uid && (
              <div className={styles.postsNavigationLink}>
                <Link href={`/post/${prevPost.uid}`}>
                  <a>
                    <span>{prevPost.title}</span>
                    Post anterior
                  </a>
                </Link>
              </div>
            )}

            {nextPost.uid && (
              <div
                className={`${styles.postsNavigationLink} ${styles.nextPost}`}
              >
                <Link href={`/post/${nextPost.uid}`}>
                  <a>
                    <span>{nextPost.title}</span>
                    Próximo post
                  </a>
                </Link>
              </div>
            )}
          </div>
        )}

        <div id="inject-comments-for-uterances" />

        {preview && <PreviewButton />}
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content,
    },
  };

  const getNextPost = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'posts'),
      Prismic.predicates.dateAfter(
        'document.first_publication_date',
        post.first_publication_date
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  const getPrevPost = await prismic.query(
    [
      Prismic.predicates.at('document.type', 'posts'),
      Prismic.predicates.dateBefore(
        'document.first_publication_date',
        post.first_publication_date
      ),
    ],
    {
      fetch: ['posts.title'],
      pageSize: 1,
    }
  );

  const nextPost = getNextPost.results.length && {
    uid: getNextPost.results[0].uid,
    title: getNextPost.results[0].data.title,
  };

  const prevPost = getPrevPost.results && {
    uid: getPrevPost.results[0].uid,
    title: getPrevPost.results[0].data.title,
  };

  return {
    props: {
      post,
      preview,
      nextPost,
      prevPost,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
