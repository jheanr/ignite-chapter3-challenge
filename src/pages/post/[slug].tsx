import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  const totalWords = post.data.content.reduce((acc, content) => {
    const words =
      content.heading.split(' ').length +
      RichText.asText(content.body).split(' ').length;

    return acc + words;
  }, 0);

  const timeToRead = `${String(Math.round(totalWords / 225) + 1)} min`;

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

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: response.data.banner,
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24, // 24 hours
  };
};
